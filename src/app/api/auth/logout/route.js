import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { supabase } from "@/app/lib/supabase";
import { logActivity } from "@/app/lib/logActivity";

export async function POST(req) {
    try {
        // Get user info before logout
        const user = await verifyToken(req.headers);

        // Log activity if user is authenticated
        if (user) {
            // Close session in Supabase
            await supabase
                .from('sessions')
                .update({
                    status: 'closed',
                    end_time: new Date().toISOString()
                })
                .eq('user_id', user.userId || user.id)
                .eq('status', 'active');

            await logActivity(null, {
                action: 'logout',
                userId: user.userId || user.id,
                username: user.username,
                description: `تسجيل خروج المستخدم ${user.username}`,
                metadata: {
                    role: user.role
                }
            });
        }

        const response = NextResponse.json(
            { success: true, message: "تم تسجيل الخروج بنجاح" },
            { status: 200 }
        );

        response.cookies.set("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0, // Expire immediately
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Logout Error:", error);
        return NextResponse.json(
            { success: false, message: "فشل تسجيل الخروج" },
            { status: 500 }
        );
    }
}
