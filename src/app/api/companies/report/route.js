import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("name");

    if (!companyName || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم الشركة مطلوب في الرابط (name query parameter)." },
        { status: 400 }
      );
    }

    // 1) Fetch products for this company
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*, batches(*)')
        .eq('company', companyName.trim());

    if (prodError) throw prodError;

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    // 2) Fetch winning records for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: salesRecords, error: winError } = await supabase
        .from('winnings')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString())
        .eq('transaction_type', 'in');

    if (winError) throw winError;

    const halfPeriod = new Date();
    halfPeriod.setDate(halfPeriod.getDate() - 15);

    // 3) Analyze each product
    const reportData = products.map((product) => {
      let firstHalfSales = 0;
      let secondHalfSales = 0;

      salesRecords?.forEach((record) => {
        if (record.reason && record.reason.includes(product.name)) {
          const recordDate = new Date(record.date);

          if (recordDate >= halfPeriod) secondHalfSales++;
          else firstHalfSales++;
        }
      });

      let trend = "stable";
      if (secondHalfSales > firstHalfSales) trend = "increasing";
      if (secondHalfSales < firstHalfSales) trend = "decreasing";

      // Calculate total quantity from batches
      const totalQty = (product.batches || []).reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

      const updatedAt = new Date(product.updated_at);
      const isShortLongTime =
        product.is_shortcoming &&
        updatedAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return {
        _id: product.id,
        name: product.name,
        quantity: totalQty,
        isShortcoming: !!product.is_shortcoming,
        unit: product.unit,
        salesCount: firstHalfSales + secondHalfSales,
        trend,
        isShortLongTime: !!isShortLongTime,
      };
    });

    return NextResponse.json({ products: reportData }, { status: 200 });
  } catch (error) {
    console.error("Company Report Error:", error);
    return NextResponse.json(
      { error: "فشل في توليد التقرير: " + error.message },
      { status: 500 }
    );
  }
}
