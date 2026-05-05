import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { logActivity } from "@/app/lib/logActivity";

export async function GET(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        if (user.role !== 'master') {
            return NextResponse.json(
                { success: false, message: "غير مسموح. هذه البيانات للمدير فقط." },
                { status: 403 }
            );
        }

        const { data: transactions, error } = await supabase
            .from('winnings')
            .select('*')
            .or('transaction_type.eq.withdrawal,and(transaction_type.eq.out,reason.ilike.%مرتب%,reason.ilike.%حافز%,reason.ilike.%مكافأة%,reason.ilike.%سحب%)')
            .order('date', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            transactions
        });

    } catch (error) {
        console.error("Payroll History GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user || user.role !== 'master') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: "ID مطلوب" }, { status: 400 });
        }

        const { data: transaction, error: fetchError } = await supabase
            .from('winnings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !transaction) {
            return NextResponse.json({ success: false, message: "العملية غير موجودة" }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from('winnings')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Log activity
        await logActivity(null, {
            action: 'delete_payroll_transaction',
            userId: user.userId,
            username: user.username,
            description: `حذف عملية مرتب/سحب بقيمة ${transaction.amount} ج.م - ${transaction.reason}`,
            metadata: {
                transactionId: id,
                amount: transaction.amount,
                reason: transaction.reason
            }
        });

        return NextResponse.json({
            success: true,
            message: "تم حذف العملية بنجاح"
        });

    } catch (error) {
        console.error("Payroll History DELETE Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
