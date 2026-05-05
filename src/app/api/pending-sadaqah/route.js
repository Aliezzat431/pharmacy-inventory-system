import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // fetch pending sadaqah
    const { data: pending, error } = await supabase
        .from('winnings')
        .select('*')
        .eq('transaction_type', 'sadaqah')
        .order('date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      pendingCount: pending?.length || 0,
      pending: pending || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "حدث خطأ: " + error.message }, { status: 500 });
  }
}
