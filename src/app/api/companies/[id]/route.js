import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

export async function PATCH(req, { params }) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = params;

    // ===== validation =====
    if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update({ name: body.name.trim() })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
       // Handle duplicate name error
      if (updateError?.code === '23505') {
        return NextResponse.json(
          { error: "الاسم موجود بالفعل. الرجاء اختيار اسم آخر." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Company not found or update failed" }, { status: 404 });
    }

    return NextResponse.json({ id: updated.id, _id: updated.id, name: updated.name });
  } catch (error) {
    console.error("PATCH company error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: "Deleted successfully", id });
  } catch (error) {
    console.error("DELETE company error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
