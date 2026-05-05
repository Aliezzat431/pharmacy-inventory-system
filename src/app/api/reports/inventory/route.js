import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const threshold = Number(await getSetting(null, "lowStockThreshold", 5));

    const { data: products, error } = await supabase
      .from('products')
      .select('*, batches(*)')
      .order('name', { ascending: true });

    if (error) throw error;

    const allProducts = products.map((p) => {
      const activeBatches = Array.isArray(p.batches) ? p.batches.filter(b => b.is_active) : [];
      let totalQty = 0;
      let earliestExpiry = null;

      activeBatches.forEach(b => {
        totalQty += (Number(b.quantity) || 0);
        const bDate = b.expiry_date ? new Date(b.expiry_date) : null;
        if (bDate && (!earliestExpiry || bDate < earliestExpiry)) {
          earliestExpiry = bDate;
        }
      });

      return {
        ...p,
        _id: p.id,
        unitOptions: p.unit_options || [],
        isShortcoming: !!p.is_shortcoming,
        quantity: totalQty,
        expiryDate: earliestExpiry,
      };
    });

    const shortcomings = allProducts.filter((p) => p.quantity < threshold);

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringSoon = allProducts.filter((p) => {
      if (!p.expiryDate) return false;
      if (isNaN(p.expiryDate.getTime())) return false;
      return p.expiryDate > now && p.expiryDate <= threeMonthsFromNow;
    });

    const expired = allProducts.filter((p) => {
      if (!p.expiryDate) return false;
      if (isNaN(p.expiryDate.getTime())) return false;
      return p.expiryDate <= now;
    });

    return NextResponse.json({
      success: true,
      data: {
        shortcomings,
        expiringSoon,
        expired,
        threshold,
      },
    });
  } catch (error) {
    console.error("Inventory Report API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
