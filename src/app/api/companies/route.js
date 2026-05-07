import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

// =========================
// DEBUG HELPER
// =========================
function logStep(step, data = null) {
  console.log(`\n========== ${step} ==========`);

  if (data) {
    try {
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log(data);
    }
  }

  console.log("================================\n");
}

// =========================
// GET ALL COMPANIES
// =========================
export async function GET(req) {
  try {
    logStep("GET /companies START");

    const user = await verifyToken(req.headers);

    logStep("VERIFY TOKEN RESULT", user);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: companies, error } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    logStep("SUPABASE GET RESULT", {
      companies,
      error,
    });

    if (error) {
      console.error("SUPABASE GET ERROR:", error);

      return NextResponse.json(
        {
          error: "Supabase GET Error",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const formatted = (companies || []).map((c) => ({
      _id: c.id,
      id: c.id,
      name: c.name,
      createdAt: c.created_at,
    }));

    logStep("FORMATTED RESPONSE", formatted);

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET companies CATCH ERROR:", error);

    return NextResponse.json(
      {
        error: "فشل في جلب الشركات",
        debug: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// =========================
// CREATE COMPANY
// =========================
export async function POST(req) {
  try {
    logStep("POST /companies START");

    const user = await verifyToken(req.headers);

    logStep("VERIFY TOKEN RESULT", user);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    logStep("REQUEST BODY", body);

    const name = body?.name?.trim();

    logStep("EXTRACTED NAME", { name });

    if (!name || name.length < 3) {
      return NextResponse.json(
        {
          error:
            "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CHECK EXACT DUPLICATE
    // =========================

    const {
      data: existingExact,
      error: exactError,
    } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    logStep("EXACT MATCH CHECK", {
      existingExact,
      exactError,
    });

    if (exactError) {
      console.error("EXACT CHECK ERROR:", exactError);

      return NextResponse.json(
        {
          error: "Exact match query failed",
          details: exactError.message,
          code: exactError.code,
        },
        { status: 500 }
      );
    }

    if (existingExact) {
      return NextResponse.json(
        {
          error: "الاسم موجود بالفعل.",
        },
        { status: 409 }
      );
    }

    // =========================
    // GET ALL COMPANIES
    // =========================

    const {
      data: allCompanies,
      error: allErr,
    } = await supabase
      .from("companies")
      .select("name");

    logStep("ALL COMPANIES", {
      allCompanies,
      allErr,
    });

    if (allErr) {
      console.error("ALL COMPANIES ERROR:", allErr);

      return NextResponse.json(
        {
          error: "Failed loading companies",
          details: allErr.message,
          code: allErr.code,
        },
        { status: 500 }
      );
    }

    // =========================
    // AI VALIDATION
    // =========================

    const existingNames = (allCompanies || []).map((c) => c.name);

    logStep("EXISTING NAMES", existingNames);

    if (existingNames.length > 0) {
      try {
        logStep("IMPORTING AI VALIDATOR");

        const { validateCompanyName } = await import(
          "@/app/lib/ai/company-validator"
        );

        logStep("RUNNING AI VALIDATION");

        const validation = await validateCompanyName(
          name,
          existingNames
        );

        logStep("AI VALIDATION RESULT", validation);

        if (validation?.isDuplicate) {
          return NextResponse.json(
            {
              error: `يبدو أن هذه الشركة موجودة بالفعل باسم "${validation.existingName}".`,
              suggestion: validation.existingName,
            },
            { status: 409 }
          );
        }
      } catch (aiError) {
        console.error("AI VALIDATION ERROR:", aiError);

        // IMPORTANT:
        // don't crash request because AI failed
      }
    }

    // =========================
    // CREATE COMPANY
    // =========================

    const {
      data: newCompany,
      error: createError,
    } = await supabase
      .from("companies")
      .insert({
        name,
      })
      .select()
      .single();

    logStep("CREATE RESULT", {
      newCompany,
      createError,
    });

    if (createError) {
      console.error("CREATE ERROR:", createError);

      return NextResponse.json(
        {
          error: "Create failed",
          details: createError.message,
          code: createError.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: newCompany.id,
      _id: newCompany.id,
      name: newCompany.name,
    });
  } catch (error) {
    console.error("POST companies CATCH ERROR:", error);

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error: "الاسم موجود بالفعل.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "فشل في إنشاء الشركة",
        debug: error.message,
        stack:
          process.env.NODE_ENV === "development"
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}

// =========================
// UPDATE COMPANY
// =========================
export async function PATCH(req) {
  try {
    logStep("PATCH /companies START");

    const user = await verifyToken(req.headers);

    logStep("VERIFY TOKEN RESULT", user);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    logStep("PATCH BODY", body);

    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        {
          error: "Missing id or name",
        },
        { status: 400 }
      );
    }

    if (
      typeof name !== "string" ||
      name.trim().length < 3
    ) {
      return NextResponse.json(
        {
          error:
            "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف.",
        },
        { status: 400 }
      );
    }

    const {
      data: updatedCompany,
      error: updateError,
    } = await supabase
      .from("companies")
      .update({
        name: name.trim(),
      })
      .eq("id", id)
      .select()
      .single();

    logStep("UPDATE RESULT", {
      updatedCompany,
      updateError,
    });

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);

      if (updateError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "الاسم موجود بالفعل. الرجاء اختيار اسم آخر.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Update failed",
          details: updateError.message,
          code: updateError.code,
        },
        { status: 500 }
      );
    }

    if (!updatedCompany) {
      return NextResponse.json(
        {
          error: "Company not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedCompany.id,
      _id: updatedCompany.id,
      name: updatedCompany.name,
    });
  } catch (error) {
    console.error("PATCH companies CATCH ERROR:", error);

    return NextResponse.json(
      {
        error: "فشل في تحديث الشركة",
        debug: error.message,
        stack:
          process.env.NODE_ENV === "development"
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}