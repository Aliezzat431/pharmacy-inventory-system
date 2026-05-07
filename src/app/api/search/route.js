import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { treatmentTypes } from "@/app/lib/unitOptions";

// Build lookup: treatment name → config
const TYPE_UNIT_MAP = treatmentTypes.reduce((acc, t) => {
  acc[t.name] = {
    baseUnit: t.baseUnit,
    units: t.units || null,
    hasConversion: t.hasConversion,
  };
  return acc;
}, {});

// safe array helper
const safeArray = (val) => (Array.isArray(val) ? val : []);

/**
 * Derive unit options safely
 */
function deriveUnitOptions(productMeta) {
  const typeInfo = TYPE_UNIT_MAP?.[productMeta?.type];

  if (typeInfo?.hasConversion && Array.isArray(typeInfo.units)) {
    return typeInfo.units;
  }

  if (Array.isArray(productMeta?.unit_options) && productMeta.unit_options.length) {
    return productMeta.unit_options;
  }

  return productMeta?.unit ? [productMeta.unit] : [];
}

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", products: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const mode = searchParams.get("mode")?.toLowerCase() || "all";

    let queryBuilder = supabase
      .from("products")
      .select("*, batches(*)");

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%`);
    }

    if (mode === "shortcomings") {
      queryBuilder = queryBuilder.eq("is_shortcoming", true);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    // 🔥 important fix: guarantee array
    const rawProducts = safeArray(data);

    const filteredProducts = query
      ? rawProducts.filter((p) => {
          const nameMatch = p?.name?.toLowerCase?.().includes(query.toLowerCase());
          const barcodeMatch =
            Array.isArray(p?.batches) &&
            p.batches.some((b) => b?.barcode === query);

          return nameMatch || barcodeMatch;
        })
      : rawProducts;

    const products = [];

    for (const product of filteredProducts) {
      const batches = safeArray(product?.batches);
      const { ...productMeta } = product;

      const unitOptions = deriveUnitOptions(productMeta);

      // no batches case
      if (batches.length === 0) {
        products.push({
          ...productMeta,
          _id: product?.id,
          batchId: null,
          barcode: null,
          quantity: 0,
          purchasePrice: 0,
          price: 0,
          sellingPrice: 0,
          expiryDate: null,
          supplier: null,
          invoiceNumber: null,
          batchNumber: null,
          unitOptions,
        });
        continue;
      }

      // batches case
      for (const batch of batches) {
        products.push({
          ...productMeta,
          _id: product?.id,
          batchId: batch?.id ?? null,
          barcode: batch?.barcode ?? null,
          quantity: batch?.quantity ?? 0,
          purchasePrice: batch?.purchase_price ?? 0,
          price: batch?.selling_price ?? 0,
          sellingPrice: batch?.selling_price ?? 0,
          expiryDate: batch?.expiry_date ?? null,
          purchaseDate: batch?.purchase_date ?? null,
          supplier: batch?.supplier ?? null,
          invoiceNumber: batch?.invoice_number ?? null,
          batchNumber: batch?.batch_number ?? null,
          isActive: batch?.is_active ?? false,
          notes: batch?.notes ?? null,
          unitOptions,
        });
      }
    }

    return NextResponse.json({
      products: safeArray(products),
    });
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        message: error?.message || "Unknown error",
        products: [],
      },
      { status: 500 }
    );
  }
}
