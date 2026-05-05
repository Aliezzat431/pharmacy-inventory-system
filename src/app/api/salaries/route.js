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
        const { employeeName, totalAmount, reason, fundingSources } = body;

        if (!fundingSources || !Array.isArray(fundingSources)) {
            return NextResponse.json({ success: false, message: "مصادر التمويل مطلوبة" }, { status: 400 });
        }

        const results = [];

        for (const source of fundingSources) {
            const { data: transaction, error: winError } = await supabase
                .from('winnings')
                .insert({
                    amount: source.amount,
                    reason: `دفع مرتب/مكافأة لـ ${employeeName}: ${reason} (تم الدفع من صيدلية ${source.pharmacyId})`,
                    transaction_type: 'out',
                    date: new Date().toISOString()
                })
                .select()
                .single();

            if (winError) throw winError;
            results.push({ pharmacyId: source.pharmacyId, id: transaction.id });

            // Log activity
            await logActivity(null, {
                action: 'salary_payment',
                userId: user.id || user.userId,
                username: user.username,
                description: `دفع ${source.amount} جنيه لـ ${employeeName}`,
                metadata: {
                    employeeName,
                    amount: source.amount,
                    totalAmount,
                    reason,
                    pharmacyId: source.pharmacyId
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `تم تسجيل دفع ${totalAmount} ج.م لـ ${employeeName} بنجاح`,
            results
        });

    } catch (error) {
        console.error("Salaries POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
