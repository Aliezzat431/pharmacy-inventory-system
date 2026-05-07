import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

// =========================
// DEBUG RESPONSE HELPER
// =========================

function debugResponse(
  message,
  error = null,
  status = 500,
  extra = {}
) {
  console.error("\n========== API ERROR ==========");
  console.error(message);

  if (error) {
    console.error(error);
  }

  console.error("================================\n");

  return NextResponse.json(
    {
      success: false,
      error: message,

      // TEMP DEBUG FOR UI
      debug: {
        message: error?.message || null,
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
        stack:
          process.env.NODE_ENV === "development"
            ? error?.stack
            : null,
      },

      ...extra,
    },
    { status }
  );
}

// =========================
// LOG HELPER
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
// GET
// =========================

export async function GET(req) {
  try {
    logStep("GET COMPANIES START");

    const user = await verifyToken(req.headers);

    if (!user) {
      return debugResponse(
        "Unauthorized",
        null,
        401
      );
    }

    const {
      data: companies,
      error,
    } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return debugResponse(
        "Supabase GET Error",
        error
      );
    }

    return NextResponse.json({
      success: true,
      companies: (companies || []).map((c) => ({
        _id: c.id,
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    return debugResponse(
      "GET companies crashed",
      error
    );
  }
}

// =========================
// POST
// =========================

export async function POST(req) {
  try {
    logStep("POST COMPANIES START");

    const user = await verifyToken(req.headers);

    logStep("USER", user);

    if (!user) {
      return debugResponse(
        "Unauthorized",
        null,
        401
      );
    }

    const body = await req.json();

    logStep("BODY", body);

    const name = body?.name?.trim();

    logStep("NAME", name);

    if (!name) {
      return debugResponse(
        "الاسم مطلوب",
        null,
        400
      );
    }

    if (name.length < 3) {
      return debugResponse(
        "اسم الشركة قصير جدًا",
        null,
        400
      );
    }

    // =========================
    // CHECK DUPLICATE
    // =========================

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    logStep("EXISTING COMPANY", {
      existing,
      existingError,
    });

    if (existingError) {
      return debugResponse(
        "فشل فحص الاسم",
        existingError
      );
    }

    if (existing) {
      return debugResponse(
        "الشركة موجودة بالفعل",
        null,
        409,
        {
          existing,
        }
      );
    }

    // =========================
    // INSERT
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
      return debugResponse(
        "فشل إنشاء الشركة",
        createError
      );
    }

    return NextResponse.json({
      success: true,
      company: {
        id: newCompany.id,
        _id: newCompany.id,
        name: newCompany.name,
      },
    });
  } catch (error) {
    return debugResponse(
      "POST companies crashed",
      error
    );
  }
}

// =========================
// PATCH
// =========================

export async function PATCH(req) {
  try {
    logStep("PATCH COMPANIES START");

    const user = await verifyToken(req.headers);

    if (!user) {
      return debugResponse(
        "Unauthorized",
        null,
        401
      );
    }

    const body = await req.json();

    logStep("PATCH BODY", body);

    const { id, name } = body;

    if (!id) {
      return debugResponse(
        "ID مطلوب",
        null,
        400
      );
    }

    if (!name) {
      return debugResponse(
        "الاسم مطلوب",
        null,
        400
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
      return debugResponse(
        "فشل تحديث الشركة",
        updateError
      );
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
    });
  } catch (error) {
    return debugResponse(
      "PATCH companies crashed",
      error
    );
  }
}