import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { typesWithUnits, treatmentTypes } from "@/app/lib/unitOptions";

export async function POST(req) {
  try {
    // ================= AUTH =================
    const user = await verifyToken(req.headers);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ================= READ BODY =================
    const raw = await req.json();

    console.log("IMPORT BODY:", raw);

    // ================= NORMALIZE INPUT FORMAT =================
    const products = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.products)
      ? raw.products
      : [];

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Invalid backup format (no products found)" },
        { status: 400 }
      );
    }

    // ================= SETTINGS =================
    const threshold = await getSetting(null, "lowStockThreshold", 5);

    let totalAmount = 0;
    const reasons = [];

    // ================= PROCESS PRODUCTS =================
    for (const p of products) {
      try {
        const firstBatch = p.batches?.[0];

        const name = p.name;
        const type = p.type || "دواء عادي برشام";
        const quantity = Number(p.totalQuantity ?? 0);

        const barcode = firstBatch?.barcode || `IMPORT-${Date.now()}`;
        const purchasePrice = Number(firstBatch?.purchasePrice ?? 0);
        const salePrice = Number(firstBatch?.sellingPrice ?? 0);
        const expiryDate = firstBatch?.expiryDate || null;

        const company = p.company || "unknown";
        const unitConversion = Number(p.unitConversion ?? 1);

        // ================= VALIDATION (soft) =================
        if (!name || !barcode) {
          console.warn("SKIP INVALID PRODUCT:", p);
          continue;
        }

        const typeDef = treatmentTypes.find((t) => t.name === type);

        if (!typeDef) {
          console.warn(`UNKNOWN TYPE SKIPPED: ${type}`);
          continue;
        }

        const allowedUnits = typesWithUnits[type] || [];

        // ================= COMPANY =================
        const { data: existingCompany, error: compErr } = await supabase
          .from("companies")
          .select("name")
          .eq("name", company)
          .single();

        if (compErr && compErr.code !== "PGRST116") throw compErr;

        if (!existingCompany) {
          await supabase.from("companies").insert({ name: company });
        }

        // ================= PRODUCT =================
        let { data: product, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("name", name.trim())
          .single();

        if (prodErr && prodErr.code !== "PGRST116") throw prodErr;

        if (!product) {
          const { data: newProd, error: insertErr } = await supabase
            .from("products")
            .insert({
              name: name.trim(),
              type,
              unit: typeDef?.baseUnit || "unit",
              unit_conversion: unitConversion,
              company,
              unit_options: allowedUnits,
              is_shortcoming: quantity < threshold,
            })
            .select()
            .single();

          if (insertErr) throw insertErr;
          product = newProd;
        }

        // ================= BATCH =================
        const { error: batchErr } = await supabase.from("batches").insert({
          product_id: product.id,
          barcode,
          quantity,
          purchase_price: purchasePrice,
          selling_price: salePrice,
          expiry_date: expiryDate
            ? new Date(expiryDate).toISOString()
            : null,
          purchase_date: new Date().toISOString(),
        });

        if (batchErr) throw batchErr;

        // ================= STOCK UPDATE =================
        const { data: allBatches } = await supabase
          .from("batches")
          .select("quantity")
          .eq("product_id", product.id);

        const totalQty = (allBatches || []).reduce(
          (sum, b) => sum + Number(b.quantity || 0),
          0
        );

        await supabase
          .from("products")
          .update({ is_shortcoming: totalQty < threshold })
          .eq("id", product.id);

        // ================= FINANCE =================
        totalAmount += purchasePrice * quantity;
        reasons.push(`${quantity} ${product.unit} ${name}`);
      } catch (err) {
        console.warn("PRODUCT SKIPPED ERROR:", err.message);
        continue;
      }
    }

    // ================= WINNINGS =================
    if (totalAmount > 0) {
      await supabase.from("winnings").insert({
        amount: totalAmount,
        reason: `تم استيراد مواد: ${reasons.join(" و ")}`,
        transaction_type: "out",
        date: new Date().toISOString(),
      });
    }

    // ================= RESPONSE =================
    return NextResponse.json(
      {
        success: true,
        message: "تم استيراد البيانات بنجاح",
        imported: products.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("IMPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "حدث خطأ أثناء الاستيراد",
      },
      { status: 500 }
    );
  }
}