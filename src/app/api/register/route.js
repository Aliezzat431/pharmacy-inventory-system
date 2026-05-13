import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import jwt from "jsonwebtoken";
import { logActivity } from "@/app/lib/logActivity";
import { registerBodySchema } from "@/app/lib/validation/schemas";
import { parseAndValidate } from "@/app/lib/validation/request";
import { hashPasswordForStorage, timingSafeEqualStrings } from "@/app/lib/auth/password";

function resolveRegistrationRole({
  masterPin,
  adminKeyFromBody,
  password,
  envMasterPin,
  adminKey,
}) {
  if (masterPin && String(masterPin).trim() !== "") {
    if (!envMasterPin) {
      return {
        ok: false,
        status: 500,
        message: "MASTER_PIN غير مضبوط على الخادم",
      };
    }
    if (!timingSafeEqualStrings(String(masterPin).trim(), envMasterPin)) {
      return { ok: false, status: 403, message: "Master PIN غير صحيح" };
    }
    return { ok: true, role: "master" };
  }

  if (!adminKey) {
    return {
      ok: false,
      status: 500,
      message: "ADMIN_KEY غير موجود — مطلوب لتسجيل موظف جديد",
    };
  }

  if (adminKeyFromBody != null && String(adminKeyFromBody).trim() !== "") {
    if (
      timingSafeEqualStrings(String(adminKeyFromBody).trim(), adminKey)
    ) {
      return { ok: true, role: "employee" };
    }
    return { ok: false, status: 403, message: "مفتاح المسؤول غير صحيح" };
  }

  if (password.includes(adminKey)) {
    return { ok: true, role: "employee" };
  }

  return {
    ok: false,
    status: 400,
    message:
      "كلمة المرور يجب أن تحتوي على مفتاح المسؤول، أو أرسل الحقل adminKey بشكل منفصل",
  };
}

export async function POST(request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: "إعدادات قاعدة البيانات غير مكتملة" },
        { status: 503 }
      );
    }

    const parsed = await parseAndValidate(request, registerBodySchema);
    if (!parsed.ok) {
      return NextResponse.json(parsed.body, { status: parsed.status });
    }

    const {
      username,
      password,
      pharmacyId,
      masterPin,
      adminKey: adminKeyFromBody,
    } = parsed.data;

    const envAdminKey = process.env.ADMIN_KEY;
    const jwtSecret = process.env.JWT_SECRET;
    const envMasterPin = process.env.MASTER_PIN;

    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET غير موجود" },
        { status: 500 }
      );
    }

    const usesMaster =
      masterPin != null && String(masterPin).trim() !== "";

    if (usesMaster && !envMasterPin) {
      return NextResponse.json(
        { success: false, message: "MASTER_PIN غير موجود على الخادم" },
        { status: 500 }
      );
    }

    if (!usesMaster && !envAdminKey) {
      return NextResponse.json(
        { success: false, message: "ADMIN_KEY غير موجود على الخادم" },
        { status: 500 }
      );
    }

    const roleResult = resolveRegistrationRole({
      masterPin,
      adminKeyFromBody,
      password,
      envMasterPin,
      adminKey: envAdminKey,
    });

    if (!roleResult.ok) {
      return NextResponse.json(
        { success: false, message: roleResult.message },
        { status: roleResult.status }
      );
    }

    const role = roleResult.role;

    const { data: existingUser, error: existingErr } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم موجود بالفعل" },
        { status: 409 }
      );
    }

    if (role === "master") {
      const { data: masterExists, error: masterErr } = await supabase
        .from("users")
        .select("id")
        .eq("role", "master")
        .limit(1);

      if (masterErr) throw masterErr;
      if (masterExists?.length > 0) {
        return NextResponse.json(
          { success: false, message: "يوجد مستخدم ماستر بالفعل" },
          { status: 403 }
        );
      }
    }

    const passwordHash = await hashPasswordForStorage(password);

    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        username,
        password: passwordHash,
        pharmacy_id: pharmacyId,
        role,
        active: true,
        base_salary: 0,
      })
      .select()
      .single();

    if (createError) throw createError;

    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        pharmacyId: newUser.pharmacy_id,
        role: newUser.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      { success: true, message: "تم التسجيل بنجاح", token },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    await logActivity(null, {
      action: "register",
      userId: newUser.id,
      username: newUser.username,
      description: `تسجيل مستخدم جديد: ${newUser.username} (${role === "master" ? "مدير" : "موظف"})`,
      metadata: {
        role: newUser.role,
        pharmacy_id: newUser.pharmacy_id,
      },
    });

    return response;
  } catch (error) {
    console.error("REGISTER API ERROR:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم: " + error.message },
      { status: 500 }
    );
  }
}
