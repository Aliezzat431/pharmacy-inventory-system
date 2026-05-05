import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { logActivity } from "@/app/lib/logActivity";

export async function POST(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        if (user.role !== 'master') {
            return NextResponse.json(
                { success: false, message: "غير مسموح. هذه العملية للمصرح لهم فقط (Master)." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { amount, reason } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ success: false, message: "المبلغ غير صحيح" }, { status: 400 });
        }

        if (!reason) {
            return NextResponse.json({ success: false, message: "السبب مطلوب" }, { status: 400 });
        }

        const { data: transaction, error: winError } = await supabase
            .from('winnings')
            .insert({
                amount: Number(amount),
                reason: `سحب مدير: ${reason}`,
                transaction_type: 'withdrawal',
                date: new Date().toISOString()
            })
            .select()
            .single();

        if (winError) throw winError;

        // Log activity
        await logActivity(null, {
            action: 'withdrawal',
            userId: user.userId,
            username: user.username,
            description: `سحب مبلغ ${amount} جنيه - ${reason}`,
            metadata: {
                amount: Number(amount),
                reason: reason
            }
        });

        return NextResponse.json({
            success: true,
            message: `تم تسجيل سحب ${amount} ج.م بنجاح`,
            id: transaction.id
        });

    } catch (error) {
        console.error("Withdrawal POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
