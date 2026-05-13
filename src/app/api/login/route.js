import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabase } from "@/app/lib/supabase";
import { logActivity } from "@/app/lib/logActivity";
import { loginBodySchema } from "@/app/lib/validation/schemas";
import { parseAndValidate } from "@/app/lib/validation/request";
import { verifyStoredPassword } from "@/app/lib/auth/password";

export async function POST(request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: "إعدادات قاعدة البيانات غير مكتملة" },
        { status: 503 }
      );
    }

    const parsed = await parseAndValidate(request, loginBodySchema);
    if (!parsed.ok) {
      return NextResponse.json(parsed.body, { status: parsed.status });
    }

    const { username, password, pharmacyId } = parsed.data;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET غير موجود في المتغيرات" },
        { status: 500 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, password, role, active")
      .eq("username", username)
      .eq("active", true)
      .maybeSingle();

    const authFailedMessage = "اسم المستخدم أو كلمة المرور غير صحيحة";

    if (userError || !user?.password) {
      return NextResponse.json(
        { success: false, message: authFailedMessage },
        { status: 401 }
      );
    }

    const passwordOk = await verifyStoredPassword(password, user.password);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, message: authFailedMessage },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        username: user.username,
        userId: user.id.toString(),
        pharmacyId,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "تم تسجيل الدخول بنجاح",
        user: {
          username: user.username,
          role: user.role,
          userId: user.id,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    await supabase
      .from("sessions")
      .update({ status: "closed", end_time: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 6 && currentHour < 18;
    const shiftType = isMorning ? "morning" : "night";

    await supabase.from("sessions").insert({
      user_id: user.id,
      username: user.username,
      start_time: new Date().toISOString(),
      shift_type: shiftType,
      status: "active",
      device_info: request.headers.get("user-agent") || "unknown",
      pharmacy_id: pharmacyId,
    });

    await logActivity(null, {
      action: "login",
      userId: user.id,
      username: user.username,
      description: `تسجيل دخول المستخدم ${user.username} (${shiftType === "morning" ? "صباحي" : "مسائي"})`,
      metadata: { role: user.role, shiftType },
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
