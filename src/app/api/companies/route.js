import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { companyNameSchema } from "@/app/lib/validation/schemas";
import { parseAndValidate } from "@/app/lib/validation/request";

const DEBUG = process.env.DEBUG_API === "1";

function log(...args) {
  if (DEBUG) console.log("[api/companies]", ...args);
}

function ok(data) {
  return NextResponse.json({ success: true, data });
}

function fail(message, status = 500, details = null) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  );
}

export async function GET(req) {
  try {
    if (!supabase) {
      return fail("قاعدة البيانات غير مهيأة", 503);
    }

    const user = await verifyToken(req.headers);
    log("GET user", user?.username);
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const { data, error } = await supabase.from("companies").select("*");

    if (error) {
      console.error("[api/companies] GET supabase:", error);
      return fail("Supabase Error", 500, error.message);
    }

    if (!data?.length) {
      return ok([]);
    }

    const formatted = data.map((c) => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      createdAt: c.created_at,
    }));

    return ok(formatted);
  } catch (error) {
    console.error("[api/companies] GET:", error);
    return fail("Server error", 500, error.message);
  }
}

export async function POST(req) {
  try {
    if (!supabase) {
      return fail("قاعدة البيانات غير مهيأة", 503);
    }

    const user = await verifyToken(req.headers);
    if (!user) {
      return fail("Unauthorized", 401);
    }

    const parsed = await parseAndValidate(req, companyNameSchema);
    if (!parsed.ok) {
      return NextResponse.json(parsed.body, { status: parsed.status });
    }

    const { name } = parsed.data;

    const { data: duplicates, error: dupErr } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", name)
      .limit(1);

    if (dupErr) {
      console.error("[api/companies] duplicate check:", dupErr);
      return fail("Supabase Error", 500, dupErr.message);
    }

    if (duplicates?.length > 0) {
      return fail("Company exists", 409);
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("companies")
      .insert({ name })
      .select()
      .single();

    if (insertErr) {
      console.error("[api/companies] insert:", insertErr);
      return fail("Supabase Error", 500, insertErr.message);
    }

    return ok(inserted);
  } catch (error) {
    console.error("[api/companies] POST:", error);
    return fail("Server error", 500, error.message);
  }
}
