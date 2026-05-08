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
   HELPERS (FORCE SAFE TYPES)
----------------------------*/
const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeNumber = (v) => (typeof v === "number" ? v : Number(v) || 0);
const safeString = (v) => (typeof v === "string" ? v : "");

/* ---------------------------
   DERIVE UNIT OPTIONS
----------------------------*/
function deriveUnitOptions(productMeta) {
  const typeInfo = TYPE_UNIT_MAP[productMeta.type];

  if (typeInfo?.hasConversion && typeInfo?.units) {
    return typeInfo.units;
  }

  return Array.isArray(productMeta.unit_options) &&
    productMeta.unit_options.length
    ? productMeta.unit_options
    : productMeta.unit
    ? [productMeta.unit]
    : [];
}

/* ---------------------------
   GET API
----------------------------*/
export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          products: [],
        },
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
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%`);
    }

    if (mode === "shortcomings") {
      queryBuilder = queryBuilder.eq("is_shortcoming", true);
    }

    const { data: rawProducts, error } = await queryBuilder;

    if (error) throw error;

    const safeProducts = safeArray(rawProducts);

    /* ---------------------------
       NORMALIZED PRODUCTS
    ----------------------------*/
    const products = safeProducts.map((product) => {
      const productMeta = product || {};
      const batches = safeArray(productMeta.batches);

      const unitOptions = deriveUnitOptions(productMeta);

      const normalizedBatches = batches.map((b) => ({
        batchId: safeString(b.id),
        barcode: safeString(b.barcode),
        quantity: safeNumber(b.quantity),
        price: safeNumber(b.selling_price),
        purchasePrice: safeNumber(b.purchase_price),
        expiryDate: safeString(b.expiry_date),
        purchaseDate: safeString(b.purchase_date),
        supplier: safeString(b.supplier),
        invoiceNumber: safeString(b.invoice_number),
        batchNumber: safeString(b.batch_number),
        isActive: Boolean(b.is_active),
        notes: safeString(b.notes),
      }));

      const totalQuantity = normalizedBatches.reduce(
        (sum, b) => sum + b.quantity,
        0
      );

      const prices = normalizedBatches.map((b) => b.price);

      return {
        _id: safeString(productMeta.id),
        name: safeString(productMeta.name),
        type: safeString(productMeta.type),

        unitOptions,

        totalQuantity,

        lowestPrice: prices.length ? Math.min(...prices) : 0,
        highestPrice: prices.length ? Math.max(...prices) : 0,

        batches: normalizedBatches,
      };
    });

    /* ---------------------------
       FINAL RESPONSE (FIXED SHAPE ALWAYS)
    ----------------------------*/
    return NextResponse.json({
      success: true,
      products: safeArray(products),
      meta: {
        count: products.length,
        mode,
        query: query || "",
      },
    });
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Server error: " + error.message,
        products: [],
        meta: {
          count: 0,
        },
      },
      { status: 500 }
    );
  }
}
