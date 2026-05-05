import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    // Try reading from cookies first (HTTP-only, secure)
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;

    // Fallback: Try reading from request body (for backward compatibility or testing)
    if (!token) {
      try {
        const body = await request.json();
        token = body.token;
      } catch (e) {
        // Body might be empty
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token غير موجود" },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "Server error: missing JWT secret" },
        { status: 500 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    return NextResponse.json(
      { success: true, message: "Token صالح", user: decoded },
      { status: 200 }
    );
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return NextResponse.json(
        { success: false, message: "Token منتهي" },
        { status: 401 }
      );
    }

    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { success: false, message: "Token غير صالح" },
        { status: 401 }
      );
    }

    console.error("Token validation error:", error);

    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء التحقق من التوكن" },
      { status: 500 }
    );
  }
}
