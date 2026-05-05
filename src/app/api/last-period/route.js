import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // 🕒 default = last 15 days
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    let startDate = from ? new Date(from) : fifteenDaysAgo;
    let endDate = to ? new Date(to) : now;

    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return NextResponse.json({ success: false, message: "Invalid dates" }, { status: 400 });
    }

    const { data: winnings, error: winError } = await supabase
        .from('winnings')
        .select('*')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .eq('transaction_type', 'in');

    if (winError) throw winError;

    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (orderError) throw orderError;

    const grouped = {};

    const initDay = (date) => {
      const d = new Date(date).toISOString().split("T")[0];
      if (!grouped[d]) {
        grouped[d] = {
          date: d,
          cashSales: 0,
          debtOrdersCount: 0,
          debtTotal: 0,
          products: {}
        };
      }
      return d;
    };

    // 💰 Cash Sales → Products
    const salesReturns = [];
    winnings.forEach(w => {
      const d = initDay(w.date);
      grouped[d].cashSales += Number(w.amount) || 0;

      if (w.reason?.startsWith("مرتجع:")) {
        salesReturns.push(w);
        return;
      }

      const parts = (w.reason || "").split(" و ");
      parts.forEach(part => {
        const text = part.trim();
        const excludePatterns = [
          /^جرد/,            // Inventory adjustments
          /^إيداع/,          // Financial deposits
          /^سحب/,           // Manager withdrawals
          /^تسديد/,         // Settlements / Debt recovery
          /صدقات/,          // Charity
          /دين/,            // Debt-related transactions
          /ديون/,           // Debt-related transactions
          /^تم دفع/,        // System messages for debt payments
          /^دفع جزئي/      // Partial debt payments
        ];

        if (excludePatterns.some(p => p.test(text))) return;

        const match = text.match(/^(\d+(?:\.\d+)?)\s+(.*?)\s+(.*)$/);
        const quantity = match ? Number(match[1]) : 1;
        const unit = match ? match[2] : "معاملة";
        const name = match ? match[3] : text || "معاملة مالية";

        const key = `${name}_${unit}_cash`;

        if (!grouped[d].products[key]) {
          grouped[d].products[key] = {
            name, unit, quantity: 0, total: 0, type: "cash"
          };
        }

        grouped[d].products[key].quantity += quantity;
        if (parts.indexOf(part) === 0) {
          grouped[d].products[key].total += Number(w.amount) || 0;
        }
      });
    });

    // 📦 Debt Orders → Products
    orders.forEach(o => {
      if (!o.debtor_id) return;

      const d = initDay(o.created_at);
      grouped[d].debtOrdersCount += 1;
      grouped[d].debtTotal += Number(o.total) || 0;

      o.items?.forEach(item => {
        const key = `${item.name}_${item.unit}_debt`;

        if (!grouped[d].products[key]) {
          grouped[d].products[key] = {
            name: item.name, unit: item.unit, quantity: 0, total: 0, type: "debt"
          };
        }

        grouped[d].products[key].quantity += Number(item.quantity) || 0;
        grouped[d].products[key].total += Number(item.total) || 0;
      });
    });

    // 🔬 Fetch product metadata for correct unit conversion in Net Sales
    const productNames = new Set();
    Object.values(grouped).forEach(day => {
      Object.keys(day.products).forEach(key => productNames.add(day.products[key].name));
    });
    salesReturns.forEach(w => {
      const itemsText = w.reason.replace("مرتجع: ", "");
      const parts = itemsText.split(" و ");
      parts.forEach(part => {
        const m = part.trim().match(/^\d+(?:\.\d+)?\s+.*?\s+(.*)$/);
        if (m) productNames.add(m[1]);
      });
    });

    const { data: dbProducts } = await supabase
        .from('products')
        .select('name, unit, unit_options, unit_conversion')
        .in('name', Array.from(productNames));

    const productMap = {};
    dbProducts?.forEach(p => { productMap[p.name] = p; });

    // 🔄 Subtract Returns (Net Sales Calculation - Unit Aware)
    salesReturns.forEach(w => {
      const itemsText = w.reason.replace("مرتجع: ", "");
      const parts = itemsText.split(" و ");

      parts.forEach(part => {
        const match = part.trim().match(/^(\d+(?:\.\d+)?)\s+(.*?)\s+(.*)$/);
        if (!match) return;

        const q = Number(match[1]); // Return Quantity
        const u = match[2];         // Return Unit
        const n = match[3];         // Product Name

        const dbP = productMap[n];
        const conversion = dbP?.unit_conversion || 1;
        const baseUnit = dbP?.unit || u; // Large unit

        const sortedDates = Object.keys(grouped).sort().reverse();
        let remainingToSub = q; // in terms of 'u'

        for (const dateStr of sortedDates) {
          if (dateStr > new Date(w.date).toISOString().split("T")[0]) continue;

          for (const key in grouped[dateStr].products) {
            const prod = grouped[dateStr].products[key];
            if (prod.name === n && prod.quantity > 0) {

              // How many of 'prod.unit' equals return unit 'u'?
              let sub;
              if (u === prod.unit) {
                sub = q;
              } else if (u === baseUnit) {
                // Return Large (Box), Sale Small (Strip): 1 Box = Conv Strips
                sub = q * conversion;
              } else {
                // Return Small (Strip), Sale Large (Box): 1 Strip = 1/Conv Box
                sub = q / conversion;
              }

              const actualSub = Math.min(prod.quantity, sub);
              const unitPrice = prod.total / prod.quantity;

              prod.quantity -= actualSub;
              prod.total -= actualSub * unitPrice;

              // Deduct from remaining (in return unit u)
              let subInReturnUnit;
              if (u === prod.unit) {
                subInReturnUnit = actualSub;
              } else if (u === baseUnit) {
                subInReturnUnit = actualSub / conversion;
              } else {
                subInReturnUnit = actualSub * conversion;
              }

              remainingToSub -= subInReturnUnit;

              if (prod.total < 0.1) prod.total = 0;
              if (prod.quantity < 0.001) prod.quantity = 0;
            }
            if (remainingToSub <= 0.0001) break;
          }
          if (remainingToSub <= 0.0001) break;
        }
      });
    });

    const result = Object.values(grouped)
      .map(day => {
        const enrichedProducts = Object.values(day.products).map(p => {
          const dbP = productMap[p.name];
          return {
            ...p,
            unitOptions: dbP?.unit_options || [p.unit],
            unitConversion: dbP?.unit_conversion || 1,
            baseUnit: dbP?.unit || p.unit
          };
        });
        return { ...day, products: enrichedProducts };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      from: startDate,
      to: endDate,
      data: result
    });

  } catch (err) {
    console.error("Report API Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
