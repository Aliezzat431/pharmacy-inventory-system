import OpenAI from "openai";
import { safeJsonParse } from "./utils";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: apiKey?.startsWith('sk-or-v1') ? "https://openrouter.ai/api/v1" : undefined
});

export async function validateCompanyName(newName, existingNames) {
    if (!apiKey) {
        console.warn("⚠️ Open AI API Key missing, skipping smart duplicate check.");
        return { isDuplicate: false };
    }

    // If list is huge, we might cap it or rely on exact match first.
    // For now, let's assume < 1000 names or we take the top N most similar string-wise if needed.
    // But LLM context is large enough for a decent list.
    const namesList = existingNames.slice(0, 300).join(", ");

    const prompt = `
    You are a data consistency assistant.
    Check if the new company name "${newName}" is a duplicate or alias of any existing company in this list:
    [${namesList}]

    Rules:
    1. "GSK" == "Glaxo Smith Kline" -> Duplicate.
    2. "Pfizer Egypt" == "Pfizer" -> Duplicate.
    3. "Pharma Overseas" != "Overseas" (Context dependent, but usually similar).
    4. "Novartis" == "Novartis Pharma" -> Duplicate.
    
    Return pure JSON:
    {
      "isDuplicate": boolean,
      "existingName": "The exact name from the list matches",
      "reason": "Short explanation"
    }
  `;

    try {
        const completion = await openai.chat.completions.create({
            model: "openai/gpt-oss-20b", // Updated to project standard
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
            temperature: 0,
            // response_format: { type: "json_object" } 
        });

        const content = completion.choices[0].message.content;
        const result = safeJsonParse(content);
        return result;

    } catch (error) {
        console.error("AI Duplicate Check Error:", error);
        // Fail open (allow creation if AI fails)
        return { isDuplicate: false };
    }
}
