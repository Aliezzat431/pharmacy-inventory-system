// app/api/returns/route.js

import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { logActivity } from "@/app/lib/logActivity";

export async function POST(req) {
  try {
    // =========================
    // AUTH
    // =========================
    const authHeader =
      req.headers.get("authorization") ||
      req.headers.get("Authorization");
console.log(authHeader,'authHeader');

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - No token",
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - Invalid token",
        },
        { status: 401 }
      );
    }

    // =========================
    // BODY
    // =========================
    const body = await req.json();

    const {
      originalInvoiceNumber,
      originalTransactionId,
      items,
      reason,
    } = body;

    if (!originalTransactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "رقم الفاتورة مطلوب",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "لا توجد منتجات للإرجاع",
        },
        { status: 400 }
      );
    }

    // =========================
    // ORIGINAL SALE
    // =========================
    const { data: originalSale, error: originalError } = await supabase
      .from("winnings")
      .select("*")
      .eq("id", originalTransactionId)
      .single();

    if (originalError || !originalSale) {
      return NextResponse.json(
        {
          success: false,
          message: "الفاتورة الأصلية غير موجودة",
        },
        { status: 404 }
      );
    }

    // =========================
    // CHECK RETURNED
    // =========================
    const { data: existingReturn } = await supabase
      .from("winnings")
      .select("id")
      .eq("transaction_type", "return")
      .contains("metadata", {
        originalTransactionId: originalTransactionId,
      })
      .maybeSingle();

    if (existingReturn) {
      return NextResponse.json(
        {
          success: false,
          message: "تم إرجاع هذه الفاتورة مسبقاً",
        },
        { status: 400 }
      );
    }

    // =========================
    // TOTAL
    // =========================
    const totalReturn = items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);

    // =========================
    // CREATE RETURN TRANSACTION
    // =========================
    const returnInvoiceNumber = `RET-${Date.now()}`;

    const metadata = {
      type: "return",
      originalTransactionId,
      originalInvoiceNumber,
      items,
      processedBy: {
        id: user.id || user.userId,
        username: user.username || user.name,
      },
    };

    const { data: returnRecord, error: insertError } = await supabase
      .from("winnings")
      .insert([
        {
          amount: -Math.abs(totalReturn),
          reason:
            reason ||
            `مرتجع فاتورة ${originalInvoiceNumber || originalTransactionId}`,
          transaction_type: "return",
          invoice_number: returnInvoiceNumber,
          metadata,
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Insert return error:", insertError);

      return NextResponse.json(
        {
          success: false,
          message: "فشل تسجيل المرتجع",
        },
        { status: 500 }
      );
    }

    // =========================
    // MARK ORIGINAL AS RETURNED
    // =========================
    await supabase
      .from("winnings")
      .update({
        metadata: {
          ...(originalSale.metadata || {}),
          isReturned: true,
          returnedAt: new Date().toISOString(),
          returnTransactionId: returnRecord.id,
        },
      })
      .eq("id", originalTransactionId);

    // =========================
    // RESTORE STOCK
    // =========================
    for (const item of items) {
      const quantityToRestore = Number(item.quantity || 0);

      // لو عندك batchId
      if (item.batchId) {
        const { data: currentProduct } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.batchId)
          .single();

        const currentQty = Number(currentProduct?.quantity || 0);

        await supabase
          .from("products")
          .update({
            quantity: currentQty + quantityToRestore,
          })
          .eq("id", item.batchId);

        continue;
      }

      // fallback productId
      if (item.productId || item._id) {
        const productId = item.productId || item._id;

        const { data: currentProduct } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", productId)
          .single();

        const currentQty = Number(currentProduct?.quantity || 0);

        await supabase
          .from("products")
          .update({
            quantity: currentQty + quantityToRestore,
          })
          .eq("id", productId);
      }
    }

    // =========================
    // LOG ACTIVITY
    // =========================
    try {
      await logActivity(null, {
        action: "return",
        userId: user.id || user.userId,
        username: user.username || user.name,
        description: `مرتجع فاتورة #${originalInvoiceNumber} بقيمة ${totalReturn} ج.م`,
        meta: {
          originalTransactionId,
          returnTransactionId: returnRecord.id,
          totalReturn,
          itemsCount: items.length,
        },
      });
    } catch (logErr) {
      console.error("Activity log error:", logErr);
    }

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json(
      {
        success: true,
        message: "تم تنفيذ المرتجع بنجاح",
        returnId: returnRecord.id,
        totalReturn,
        returnInvoiceNumber,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("RETURN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "حدث خطأ غير متوقع",
      },
      { status: 500 }
    );
  }
}