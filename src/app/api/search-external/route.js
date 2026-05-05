import { NextResponse } from "next/server";
import OpenAI from "openai";

// Fallback data
const EGYPT_DRUGS_MOCK = [];

const searchCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const ALLOWED_TYPES = [
  "مضاد حيوي شرب","مضاد حيوي برشام","دواء عادي برشام","فيتامين برشام",
  "فيتامين شرب","دواء شرب عادي","نقط فم","نقط أنف","بخاخ فم","بخاخ أنف",
  "مرهم","مستحضرات","لبوس","حقن","فوار"
].map(t => t.toLowerCase());

export async function GET(req) {
  const isDev = process.env.NODE_ENV !== "production";

  const debug = (label, data) => {
    if (isDev) console.log(`[SEARCH DEBUG] ${label}:`, data);
  };

  if (!req.url) {
    debug("REQ_URL", "Missing req.url");
    return NextResponse.json({ results: [], debug: "Missing req.url" });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase();
  const type = searchParams.get("type")?.trim().toLowerCase();

  debug("QUERY", query);
  debug("TYPE", type);

  if (!query) {
    debug("NO_QUERY", "Query is empty");
    return NextResponse.json({ results: [], debug: "Query is empty" });
  }

  const cacheKey = `${query}:${type || "all"}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    debug("CACHE_HIT", { cacheKey, age: Date.now() - cached.timestamp });
    return NextResponse.json({ results: cached.data, debug: "CACHE_HIT" });
  }

  if (type && !ALLOWED_TYPES.includes(type)) {
    debug("INVALID_TYPE", { type, allowed: ALLOWED_TYPES });
    return NextResponse.json({
      error: "نوع المنتج غير صالح",
      allowedTypes: ALLOWED_TYPES,
      debug: "INVALID_TYPE"
    }, { status: 400 });
  }

  let results = [];
  const OR_KEY = process.env.OPENAI_API_KEY;

  if (!OR_KEY) {
    debug("NO_OR_KEY", "OPENROUTER_API_KEY is missing");
  } else {
    try {
      const prompt = `
You are a pharmacy expert in Egypt.
Return a JSON array of up to 5 real pharmaceutical products in Egypt matching: "${query}" ${type ? `of type "${type}"` : ""}.
Include: name, type, salePrice, purchasePrice, company, unitConversion, details.
Return ONLY raw JSON array.
`;

      debug("PROMPT", prompt);

      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OR_KEY,
      });

      const completion = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1500
      });

      const content = completion.choices?.[0]?.message?.content;
      debug("AI_RAW_CONTENT", content);

      if (content) {
        const sanitized = content.replace(/\r/g, " ").trim();
        debug("AI_SANITIZED", sanitized);

        const tryParse = (text) => {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {}
          return null;
        };

        // 1) parse directly
        let parsed = tryParse(sanitized);

        // 2) parse inside code block
        if (!parsed) {
          const codeMatch = sanitized.match(/```json([\s\S]*?)```/i);
          if (codeMatch) parsed = tryParse(codeMatch[1].trim());
        }

        // 3) parse array inside text
        if (!parsed) {
          const arrayMatch = sanitized.match(/\[[\s\S]*\]/);
          if (arrayMatch) parsed = tryParse(arrayMatch[0]);
        }

        if (parsed) {
          results = parsed.map(r => ({ ...r, isAi: true }));
        }
      }

      if (results.length > 0) {
        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
        debug("CACHE_SET", { cacheKey, count: results.length });
      }

    } catch (err) {
      debug("AI_ERROR", err?.message || err);
      return NextResponse.json({ error: "AI service error", debug: err?.message || err }, { status: 500 });
    }
  }

  if (results.length === 0) {
    debug("FALLBACK_START", { query });
    results = EGYPT_DRUGS_MOCK
      .filter(d => d.name.toLowerCase().includes(query))
      .map(r => ({ ...r, isFallback: true }));

    debug("FALLBACK_END", { resultsCount: results.length });
  }

  return NextResponse.json({ results, debug: "DONE" });
}
