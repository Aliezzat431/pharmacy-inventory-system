import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { treatmentTypes } from "@/app/lib/unitOptions";

// Build a lookup: treatment name → { baseUnit, units, hasConversion }
const TYPE_UNIT_MAP = treatmentTypes.reduce((acc, t) => {
  acc[t.name] = { baseUnit: t.baseUnit, units: t.units || null, hasConversion: t.hasConversion };
  return acc;
}, {});

/**
 * Derive the correct unitOptions for a product dynamically from its type.
 * Priority:
 *   1. Computed from product.type (always up-to-date with unitOptions.js)
 *   2. unit_options DB column (legacy fallback)
 *   3. [product.unit]
 */
function deriveUnitOptions(productMeta) {
  const typeInfo = TYPE_UNIT_MAP[productMeta.type];
  if (typeInfo && typeInfo.hasConversion && typeInfo.units) {
    // Always show all configured units for convertible types.
    return typeInfo.units;
  }
  return productMeta.unit_options?.length
    ? productMeta.unit_options
    : [productMeta.unit];
}

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const mode = searchParams.get("mode")?.toLowerCase() || "all";

    // Build the Supabase query
    let queryBuilder = supabase
        .from('products')
        .select('*, batches(*)');

    if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%`);
    }

    if (mode === "shortcomings") {
        queryBuilder = queryBuilder.eq('is_shortcoming', true);
    }

    const { data: rawProducts, error } = await queryBuilder;

    if (error) throw error;

    // Additional filtering for barcode (batches barcode search)
    const filteredProducts = query
        ? rawProducts.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (Array.isArray(p.batches) && p.batches.some(b => b.barcode === query))
          )
        : rawProducts;

    const products = [];

    for (const product of filteredProducts) {
      const { batches, ...productMeta } = product;

      // Derive unitOptions dynamically so it always matches unitOptions.js
      const unitOptions = deriveUnitOptions(productMeta);

      if (!batches || batches.length === 0) {
        products.push({
          ...productMeta,
          _id: product.id,
          batchId: null,
          barcode: null,
          quantity: 0,
          purchasePrice: 0,
          price: 0,
          expiryDate: null,
          supplier: null,
          invoiceNumber: null,
          batchNumber: null,
          unitOptions,
        });
        continue;
      }

      for (const batch of batches) {
        products.push({
          ...productMeta,
          _id: product.id,
          batchId: batch.id,
          barcode: batch.barcode,
          quantity: batch.quantity,
          purchasePrice: batch.purchase_price,
          price: batch.selling_price,
          sellingPrice: batch.selling_price,
          expiryDate: batch.expiry_date,
          purchaseDate: batch.purchase_date,
          supplier: batch.supplier,
          invoiceNumber: batch.invoice_number,
          batchNumber: batch.batch_number,
          isActive: batch.is_active,
          notes: batch.notes,
          unitOptions,
        });
      }
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}
