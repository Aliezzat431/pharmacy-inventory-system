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
        const { employeeId, employeeName, amount, reason } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ success: false, message: "المبلغ غير صحيح" }, { status: 400 });
        }

        if (!employeeId || !employeeName) {
            return NextResponse.json({ success: false, message: "بيانات الموظف ناقصة" }, { status: 400 });
        }

        // Record the salary payment as an 'out' transaction
        const { data: transaction, error: winError } = await supabase
            .from('winnings')
            .insert({
                amount: Number(amount),
                reason: reason || `مرتب الموظف: ${employeeName}`,
                transaction_type: 'out',
                date: new Date().toISOString()
            })
            .select()
            .single();

        if (winError) throw winError;

        // Log activity
        await logActivity(null, {
            action: 'salary_payment',
            userId: user.userId,
            username: user.username,
            description: `صرف مرتب لـ ${employeeName} بقيمة ${amount} ج.م - ${reason || 'مرتب شهر'}`,
            metadata: {
                employeeId,
                employeeName,
                amount: Number(amount),
                transactionId: transaction.id
            }
        });

        return NextResponse.json({
            success: true,
            message: `تم صرف مرتب ${employeeName} بقيمة ${amount} ج.م بنجاح`,
            id: transaction.id
        });

    } catch (error) {
        console.error("Salary Payment POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
