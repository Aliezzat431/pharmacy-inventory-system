import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    // نجيب كل الصدقات اللي لسه مش مدفوعة
    const { data: pending, error: fetchError } = await supabase
        .from('winnings')
        .select('*')
        .eq('transaction_type', 'sadaqah');

    if (fetchError) throw fetchError;

    if (!pending || !pending.length) {
      return NextResponse.json({
        success: false,
        message: "لا توجد صدقات غير مدفوعة الآن",
      });
    }

    let totalPaid = 0;
    const payEntries = pending.map((item) => {
      totalPaid += Number(item.amount);
      return {
        amount: Number(item.amount),
        reason: "تسديد صدقات",
        transaction_type: "in",
        date: new Date().toISOString(),
      };
    });

    // Insert دفعة واحدة
    const { error: insertError } = await supabase
        .from('winnings')
        .insert(payEntries);
    
    if (insertError) throw insertError;

    // نعمل تحديث لكل الصدقات دفعة واحدة
    const ids = pending.map((p) => p.id);
    const { error: updateError } = await supabase
        .from('winnings')
        .update({ transaction_type: "sadaqahPaid", reason: "صدقة مدفوعة" })
        .in('id', ids);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `تم تسديد ${totalPaid} ج.م كصدقات وتم تسجيلها كدخل.`,
      data: {
        totalPaid,
        count: pending.length,
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ: " + error.message },
      { status: 500 }
    );
  }
}
