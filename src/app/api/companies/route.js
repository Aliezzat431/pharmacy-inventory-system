import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

// =======================
// RESPONSE HELPERS
// =======================
const ok = (data) =>
  NextResponse.json({
    success: true,
    data,
  });

const fail = (error, status = 500, details = null, code = null) =>
  NextResponse.json(
    {
      success: false,
      error,
      details,
      code,
    },
    { status }
  );

// =======================
// GET ALL COMPANIES
// =======================
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return fail("Unauthorized", 401);
    }

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("GET companies error:", error);
      return fail("Supabase error", 500, error.message, error.code);
    }

    const formatted = (data || []).map((c) => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      createdAt: c.created_at,
    }));

    return ok(formatted);
  } catch (error) {
    console.error("GET CATCH ERROR:", error);
    return fail("فشل في جلب الشركات", 500, error.message);
  }
}

// =======================
// CREATE COMPANY
// =======================
export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return fail("Unauthorized", 401);
    }

    const body = await req.json();
    const name = body?.name?.trim();

    if (!name || name.length < 3) {
      return fail("اسم الشركة غير صالح", 400);
    }

    // check duplicate
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return fail("الاسم موجود بالفعل", 409);
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error("INSERT ERROR:", error);
      return fail("فشل في إنشاء الشركة", 500, error.message, error.code);
    }

    return ok({
      _id: data.id,
      id: data.id,
      name: data.name,
    });
  } catch (error) {
    console.error("POST CATCH ERROR:", error);
    return fail("فشل في إنشاء الشركة", 500, error.message);
  }
}

// =======================
// UPDATE COMPANY
// =======================
export async function PATCH(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return fail("Unauthorized", 401);
    }

    const { id, name } = await req.json();

    if (!id || !name) {
      return fail("Missing id or name", 400);
    }

    const { data, error } = await supabase
      .from("companies")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return fail("الاسم موجود بالفعل", 409);
      }

      console.error("UPDATE ERROR:", error);
      return fail("فشل في التحديث", 500, error.message, error.code);
    }

    if (!data) {
      return fail("Company not found", 404);
    }

    return ok({
      _id: data.id,
      id: data.id,
      name: data.name,
    });
  } catch (error) {
    console.error("PATCH CATCH ERROR:", error);
    return fail("فشل في التحديث", 500, error.message);
  }
}

// =======================
// DELETE COMPANY
// =======================
export async function DELETE(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return fail("Unauthorized", 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return fail("Missing id", 400);
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE ERROR:", error);
      return fail("فشل في الحذف", 500, error.message, error.code);
    }

    return ok({ id });
  } catch (error) {
    console.error("DELETE CATCH ERROR:", error);
    return fail("فشل في الحذف", 500, error.message);
  }
}