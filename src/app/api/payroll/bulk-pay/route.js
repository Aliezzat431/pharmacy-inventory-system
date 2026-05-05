import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { logActivity } from "@/app/lib/logActivity";

export async function POST(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user || user.role !== 'master') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, amount, reason } = body; // type: 'salary' or 'incentive'

        // Fetch all active employees
        const { data: employees, error: empError } = await supabase
            .from('users')
            .select('*')
            .eq('active', true);

        if (empError) throw empError;

        if (!employees || !employees.length) {
            return NextResponse.json({ success: false, message: "لا يوجد موظفين نشطين" }, { status: 400 });
        }

        const results = [];
        const currentMonth = new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(new Date());

        for (const emp of employees) {
            let finalAmount = 0;
            let finalReason = "";
            const displayName = emp.username; // in Supabase we use username

            if (type === 'salary') {
                finalAmount = Number(emp.base_salary || 0);
                if (finalAmount <= 0) continue;
                finalReason = `${reason || `مرتب شهر ${currentMonth}`} - لـ ${displayName}`;
            } else {
                finalAmount = Number(amount);
                if (!finalAmount || finalAmount <= 0) {
                    return NextResponse.json({ success: false, message: "المبلغ مطلوب للحوافز" }, { status: 400 });
                }
                finalReason = `${reason || 'حافز'} - لـ ${displayName}`;
            }

            const { error: winError } = await supabase
                .from('winnings')
                .insert({
                    amount: finalAmount,
                    reason: finalReason,
                    transaction_type: 'out',
                    date: new Date().toISOString()
                });

            if (winError) throw winError;

            results.push({ employee: displayName, amount: finalAmount });
        }

        // Log bulk activity
        await logActivity(null, {
            action: 'bulk_salary_payment',
            userId: user.userId,
            username: user.username,
            description: `صرف ${type === 'salary' ? 'مرتبات' : 'حوافز'} جماعية لعدد ${results.length} موظف`,
            metadata: {
                type,
                count: results.length,
                totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
            }
        });

        return NextResponse.json({
            success: true,
            message: `تم صرف ${type === 'salary' ? 'المرتبات' : 'الحوافز'} بنجاح لعدد ${results.length} موظف`,
            results
        });

    } catch (error) {
        console.error("Bulk Payroll POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
