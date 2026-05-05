import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

// GET all companies
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json(companies.map(c => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      createdAt: c.created_at
    })));
  } catch (error) {
    console.error("GET companies error:", error);
    return NextResponse.json(
      { error: "فشل في جلب الشركات" },
      { status: 500 }
    );
  }
}

// POST create company
export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = body?.name?.trim();

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    // 1. Basic Exact Match Check
    const { data: existingExact, error: findError } = await supabase
      .from('companies')
      .select('name')
      .ilike('name', name)
      .single();

    if (existingExact) {
      return NextResponse.json(
        { error: "الاسم موجود بالفعل." },
        { status: 409 }
      );
    }

    // 2. AI Smart Check
    const { data: allCompanies, error: allErr } = await supabase
      .from('companies')
      .select('name');
    
    const existingNames = allCompanies ? allCompanies.map(c => c.name) : [];

    if (existingNames.length > 0) {
      const { validateCompanyName } = await import("@/app/lib/ai/company-validator");
      const validation = await validateCompanyName(name, existingNames);

      if (validation && validation.isDuplicate) {
        return NextResponse.json(
          {
            error: `يبدو أن هذه الشركة موجودة بالفعل باسم "${validation.existingName}".`,
            suggestion: validation.existingName
          },
          { status: 409 }
        );
      }
    }

    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({ name })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({ id: newCompany.id, _id: newCompany.id, name: newCompany.name });
  } catch (error) {
    console.error("POST companies error:", error);

    // duplicate name error (postgres fallback)
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: "الاسم موجود بالفعل." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "فشل في إنشاء الشركة" },
      { status: 500 }
    );
  }
}

// PATCH update company
export async function PATCH(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing id or name" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedCompany) {
      if (updateError?.code === '23505') {
        return NextResponse.json(
          { error: "الاسم موجود بالفعل. الرجاء اختيار اسم آخر." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Not Found or Update Failed" }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedCompany.id,
      _id: updatedCompany.id,
      name: updatedCompany.name,
    });
  } catch (error) {
    console.error("PATCH companies error:", error);
    return NextResponse.json(
      { error: "فشل في تحديث الشركة" },
      { status: 500 }
    );
  }
}
