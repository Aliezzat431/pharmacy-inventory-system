import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: "غير مصرح (No Token)" },
                { status: 401 }
            );
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json(
                { success: false, message: "Server Config Error" },
                { status: 500 }
            );
        }

        try {
            const decoded = jwt.verify(token, jwtSecret);
            return NextResponse.json(
                { success: true, user: decoded },
                { status: 200 }
            );
        } catch (err) {
            return NextResponse.json(
                { success: false, message: "رمز الدخول غير صالح أو منتهي" },
                { status: 401 }
            );
        }

    } catch (error) {
        console.error("Auth Check Error:", error);
        return NextResponse.json(
            { success: false, message: "فشل التحقق من الجلسة" },
            { status: 500 }
        );
    }
}
