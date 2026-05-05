import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Clear all main tables
    // batches is deleted by cascade if products are deleted, but let's be explicit if needed
    await supabase.from('batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('winnings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('debtors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({
      success: true,
      message: "تم تصفير قاعدة البيانات بنجاح.",
    });
  } catch (error) {
    console.error("Wipe error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تصفير البيانات: " + error.message },
      { status: 500 }
    );
  }
}
