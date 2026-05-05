import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { getSetting } from "@/app/lib/getSetting";

export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const full = searchParams.get("full") === "true";

    if (full) {
      const { data: rawWinnings, error } = await supabase
        .from('winnings')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return NextResponse.json(rawWinnings);
    }

    const baseCapital = await getSetting(null, 'baseCapital', 100000);
    const { data: rawWinnings, error } = await supabase
      .from('winnings')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;

    const grouped = rawWinnings.reduce((acc, curr) => {
      const dateStr = new Date(curr.date).toISOString().split('T')[0];

      if (!acc[dateStr]) {
        acc[dateStr] = {
          _id: dateStr,
          totalIn: 0,
          totalOut: 0,
          totalSuspended: 0,
          totalSadaqah: 0,
          totalWithdrawal: 0,
          orders: []
        };
      }

      // حساب المبالغ
      const amount = Number(curr.amount || 0);
      const type = curr.transaction_type;

      if (type === 'in') acc[dateStr].totalIn += amount;
      else if (type === 'out') acc[dateStr].totalOut += amount;
      else if (type === 'suspended') acc[dateStr].totalSuspended += amount;
      else if (type === 'sadaqah') acc[dateStr].totalSadaqah += amount;
      else if (type === 'sadaqahPaid') acc[dateStr].totalIn += amount;
      else if (type === 'withdrawal') acc[dateStr].totalWithdrawal += amount;

      const reason = type === 'sadaqah'
        ? "صدقة (غير مدفوعة)"
        : curr.reason;

      // Only add to visible history if it's NOT a hidden return (negative in)
      if (!(type === 'in' && amount < 0)) {
        acc[dateStr].orders.push({
          reason,
          amount: amount,
          type: type === 'sadaqah' ? 'sadaqah' : type
        });
      }

      return acc;
    }, {});

    const result = Object.values(grouped).sort((a, b) => a._id.localeCompare(b._id));

    // Role-based data restriction
    if (user.role !== 'master') {
      const restrictedFinal = result.map(day => ({
        date: day._id,
        orders: day.orders.map(order => ({
          reason: order.reason,
          type: order.type
        }))
      }));
      return NextResponse.json(restrictedFinal);
    }

    let runningTotal = baseCapital;
    const final = result.map(day => {
      // هنا بنحسب صافي اليوم بشكل كامل
      const netProfit = day.totalIn - (day.totalOut + day.totalSadaqah + (day.totalWithdrawal || 0));

      runningTotal += netProfit;

      return {
        date: day._id,
        totalIn: day.totalIn,
        totalOut: day.totalOut,
        totalSuspended: day.totalSuspended,
        totalSadaqah: day.totalSadaqah || 0,
        totalWithdrawal: day.totalWithdrawal || 0,
        currentCapital: runningTotal,
        orders: day.orders
      };
    });

    return NextResponse.json(final);
  } catch (error) {
    console.error("Winnings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily profit report" },
      { status: 500 }
    );
  }
}
