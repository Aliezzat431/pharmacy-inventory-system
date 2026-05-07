import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { treatmentTypes } from "@/app/lib/unitOptions";

/* ---------------------------
   UNIT MAP
----------------------------*/
const TYPE_UNIT_MAP = treatmentTypes.reduce((acc, t) => {
  acc[t.name] = {
    baseUnit: t.baseUnit,
    units: t.units || null,
    hasConversion: t.hasConversion,
  };
  return acc;
}, {});

/* ---------------------------
   DERIVE UNIT OPTIONS
----------------------------*/
function deriveUnitOptions(productMeta) {
  const typeInfo = TYPE_UNIT_MAP[productMeta.type];

  if (typeInfo?.hasConversion && typeInfo?.units) {
    return typeInfo.units;
  }

  return productMeta.unit_options?.length
    ? productMeta.unit_options
    : [productMeta.unit];
}

/* ---------------------------
   GET API
----------------------------*/
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const mode = searchParams.get("mode")?.toLowerCase() || "all";

    /* ---------------------------
       SUPABASE QUERY
    ----------------------------*/
    let queryBuilder = supabase
      .from("products")
      .select("*, batches(*)");

    if (query) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${query}%`
      );
    }

    if (mode === "shortcomings") {
      queryBuilder = queryBuilder.eq("is_shortcoming", true);
    }

    const { data: rawProducts, error } = await queryBuilder;

    if (error) throw error;

    const safeProducts = Array.isArray(rawProducts)
      ? rawProducts
      : [];

    /* ---------------------------
       NORMALIZE RESPONSE
    ----------------------------*/
    const products = safeProducts.map((product) => {
      const { batches, ...productMeta } = product;

      const unitOptions = deriveUnitOptions(productMeta);

      const safeBatches = Array.isArray(batches)
        ? batches
        : [];

      const totalQuantity = safeBatches.reduce(
        (sum, b) => sum + (b.quantity || 0),
        0
      );

      const prices = safeBatches.map(
        (b) => b.selling_price || 0
      );

      return {
        _id: product.id,
        name: product.name,
        type: product.type,

        unitOptions,

        totalQuantity,

        lowestPrice: prices.length
          ? Math.min(...prices)
          : 0,

        highestPrice: prices.length
          ? Math.max(...prices)
          : 0,

        batches: safeBatches.map((b) => ({
          batchId: b.id,
          barcode: b.barcode,
          quantity: b.quantity,
          price: b.selling_price,
          purchasePrice: b.purchase_price,
          expiryDate: b.expiry_date,
          purchaseDate: b.purchase_date,
          supplier: b.supplier,
          invoiceNumber: b.invoice_number,
          batchNumber: b.batch_number,
          isActive: b.is_active,
          notes: b.notes,
        })),
      };
    });

    /* ---------------------------
       FINAL RESPONSE
    ----------------------------*/
    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Server error: " + error.message,
        products: [],
      },
      { status: 500 }
    );
  }
}
