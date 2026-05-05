import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { logActivity } from "@/app/lib/logActivity";
import { deductProductQuantity } from "@/app/lib/productHelpers";

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // ====== validation ======
    const products = body.orders;
    const payAmount = Number(body.partialPayment || 0);

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة)." },
        { status: 400 }
      );
    }

    if (isNaN(payAmount) || payAmount < 0) {
      return NextResponse.json(
        { error: "قيمة الدفع غير صحيحة." },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: "اسم العميل مطلوب ويجب أن يكون نصًا صحيحًا." },
        { status: 400 }
      );
    }

    const createdItems = [];
    let totalOrderAmount = 0;
    let totalProfit = 0;
    const reasonParts = [];

    for (const productData of products) {
      const {
        name,
        unit,
        quantity,
        fullProduct,
        price,
        unitOptions = [],
      } = productData;

      const parsedQuantity = Number(quantity);
      const normalizedUnit = typeof unit === "string" ? unit : unit?.value || "";

      if (!name || !normalizedUnit || parsedQuantity === undefined) {
        throw new Error("يجب توفير الاسم والوحدة والكمية على الأقل لكل منتج");
      }

      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error(`الكمية غير صحيحة للمنتج "${name}".`);
      }

      const usedPrice = Number(price || fullProduct?.price || 0);
      if (isNaN(usedPrice) || usedPrice < 0) {
        throw new Error(`السعر غير صحيح للمنتج "${name}".`);
      }

      const itemTotal = usedPrice * parsedQuantity;

      const normalizedUnitOptions = unitOptions
        .map((opt) => (typeof opt === "string" ? opt : opt?.value || ""))
        .filter(Boolean);

      createdItems.push({
        name,
        price: usedPrice,
        quantity: parsedQuantity,
        unit: normalizedUnit,
        total: itemTotal,
        unitOptions: normalizedUnitOptions,
        fullProduct: fullProduct || {},
      });

      // ====== Stock Update ======
      const isAgel =
        fullProduct?._id === "agel" ||
        fullProduct?.id === "agel" ||
        fullProduct?.type === "agel";

      if (!isAgel && (fullProduct?._id || fullProduct?.id)) {
        const prodId = fullProduct.id || fullProduct._id;

        const { data: product, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('id', prodId)
            .single();

        if (product) {
          let quantityToDeduct = parsedQuantity;
          // Unit conversion logic (simplified)
          if (normalizedUnit !== product.unit && product.unit_conversion > 0) {
              quantityToDeduct = parsedQuantity / product.unit_conversion;
          }

          const deduction = await deductProductQuantity(
              product.id,
              quantityToDeduct,
              product.inventory_method || 'FEFO'
          );
          
          totalProfit += deduction.profit;
        } else {
          throw new Error(`المنتج غير موجود في المخزون: ${name}`);
        }
      }

      totalOrderAmount += itemTotal;
      reasonParts.push(`${parsedQuantity} ${normalizedUnit} ${name}`);
    }

    if (payAmount > totalOrderAmount) {
      throw new Error("المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الطلب.");
    }

    // ====== Find or create debtor ======
    let { data: debtor, error: dError } = await supabase
        .from('debtors')
        .select('*')
        .eq('name', body.name.trim())
        .single();

    if (!debtor) {
        const { data: newDebtor, error: nError } = await supabase
            .from('debtors')
            .insert({ name: body.name.trim(), partial_payments: 0 })
            .select()
            .single();
        if (nError) throw nError;
        debtor = newDebtor;
    }

    // ====== Create Order ======
    const { error: oError } = await supabase
        .from('orders')
        .insert({
            debtor_id: debtor.id,
            total: totalOrderAmount,
            items: createdItems
        });
    if (oError) throw oError;

    // ====== Winning & Debtor Update ======
    if (payAmount > 0) {
        await supabase
            .from('debtors')
            .update({ partial_payments: (debtor.partial_payments || 0) + payAmount })
            .eq('id', debtor.id);

        await supabase
            .from('winnings')
            .insert({
                amount: payAmount,
                reason: `دفع جزئي عند تسجيل دين للعميل ${body.name} عن ${reasonParts.join(" + ")}`,
                transaction_type: "in",
                date: new Date().toISOString()
            });
    } else {
        await supabase
            .from('winnings')
            .insert({
                amount: totalOrderAmount,
                profit: totalProfit,
                reason: `تم تسجيل دين للعميل ${body.name} بدون دفع (سند معلق)`,
                transaction_type: "suspended",
                debtor_id: debtor.id,
                date: new Date().toISOString()
            });
    }

    // ====== Final check for full payment ======
    const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('debtor_id', debtor.id);
    
    const totalDebtAmount = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
    const { data: updatedDebtor } = await supabase
        .from('debtors')
        .select('partial_payments')
        .eq('id', debtor.id)
        .single();

    if (updatedDebtor && updatedDebtor.partial_payments >= totalDebtAmount) {
        await supabase.from('orders').delete().eq('debtor_id', debtor.id);
        await supabase.from('debtors').delete().eq('id', debtor.id);
    }

    // Log activity
    await logActivity(null, {
      action: 'debt_create',
      userId: user.userId,
      username: user.username,
      description: `إنشاء دين للعميل "${body.name}" بمبلغ ${totalOrderAmount.toFixed(2)} جنيه (مدفوع: ${payAmount} جنيه)`,
      metadata: {
        debtorName: body.name,
        totalAmount: totalOrderAmount,
        paidAmount: payAmount,
        remainingAmount: totalOrderAmount - payAmount,
        itemsCount: createdItems.length,
        items: reasonParts
      }
    });

    return NextResponse.json({
      success: true,
      createdProducts: createdItems,
      totalAmount: totalOrderAmount,
      paidAmount: payAmount,
      remainingAmount: totalOrderAmount - payAmount,
      reason: reasonParts.join(" + "),
    });

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: error.message || "خطأ في الخادم" }, { status: 500 });
  }
}


export async function GET(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const { data: debtors, error: debtorError } = await supabase
        .from('debtors')
        .select('*');

    if (debtorError) throw debtorError;

    const enrichedDebtors = await Promise.all(
      debtors.map(async (debtor) => {
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('debtor_id', debtor.id);

        if (orderError) throw orderError;

        const ordersTotal = orders.reduce(
          (sum, order) => sum + (Number(order.total) || 0),
          0
        );
        const paid = Number(debtor.partial_payments || 0);
        const totalDebt = ordersTotal - paid;

        return {
          ...debtor,
          _id: debtor.id,
          orders: orders.map(o => ({ ...o, _id: o.id })),
          totalDebt,
          totalOrders: ordersTotal,
          paid,
          partialPayments: paid
        };
      })
    );

    return NextResponse.json(enrichedDebtors, { status: 200 });
  } catch (error) {
    console.error("GET /api/debt error:", error);
    return NextResponse.json(
      { message: "فشل في جلب المديونيات" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const body = await req.json();
    const { name, payAmount } = body;

    if (!name || typeof payAmount !== "number" || payAmount <= 0) {
      return NextResponse.json(
        { message: "الاسم ومبلغ الدفع مطلوب" },
        { status: 400 }
      );
    }

    const { data: debtor, error: dError } = await supabase
        .from('debtors')
        .select('*')
        .eq('name', name)
        .single();

    if (dError || !debtor)
      return NextResponse.json(
        { message: "المدين غير موجود" },
        { status: 404 }
      );

    let remaining = payAmount;
    let totalPaid = 0;

    // Handle suspended transactions first
    const { data: suspendedTransactions } = await supabase
        .from('winnings')
        .select('*')
        .eq('transaction_type', 'suspended')
        .eq('debtor_id', debtor.id)
        .order('date', { ascending: true });

    if (suspendedTransactions) {
        for (const tx of suspendedTransactions) {
            if (remaining <= 0) break;
            const deductAmount = Math.min(Number(tx.amount), remaining);
            remaining -= deductAmount;
            totalPaid += deductAmount;

            if (deductAmount === Number(tx.amount)) {
                await supabase.from('winnings').delete().eq('id', tx.id);
            } else {
                await supabase.from('winnings').update({ amount: Number(tx.amount) - deductAmount }).eq('id', tx.id);
            }

            await supabase
                .from('winnings')
                .insert({
                    amount: deductAmount,
                    reason: `تم خصم ${deductAmount} من المعاملة المعلقة للعميل ${name}`,
                    transaction_type: "in",
                    date: new Date().toISOString()
                });
        }
    }

    // Handle debt update
    if (remaining > 0) {
        const { data: orders } = await supabase
            .from('orders')
            .select('total')
            .eq('debtor_id', debtor.id);

        const totalDebt = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
        const currentPaid = Number(debtor.partial_payments || 0);
        const balanceDebt = totalDebt - currentPaid;

        if (balanceDebt > 0) {
            const partialPayment = Math.min(remaining, balanceDebt);
            remaining -= partialPayment;
            totalPaid += partialPayment;

            await supabase
                .from('debtors')
                .update({ partial_payments: currentPaid + partialPayment })
                .eq('id', debtor.id);

            await supabase
                .from('winnings')
                .insert({
                    amount: partialPayment,
                    reason: `تم دفع ${partialPayment} من ديون المنتجات للعميل ${name}`,
                    transaction_type: "in",
                    date: new Date().toISOString()
                });
        }
    }

    // Final check for full payment
    const { data: finalOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('debtor_id', debtor.id);
    const finalTotalDebt = finalOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

    const { data: finalDebtor } = await supabase
        .from('debtors')
        .select('partial_payments')
        .eq('id', debtor.id)
        .single();

    if (finalDebtor && Number(finalDebtor.partial_payments) >= finalTotalDebt) {
        const { count: leftSuspendedCount } = await supabase
            .from('winnings')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_type', 'suspended')
            .ilike('reason', `%${name}%`);

        if (leftSuspendedCount === 0) {
            await supabase.from('orders').delete().eq('debtor_id', debtor.id);
            await supabase.from('debtors').delete().eq('id', debtor.id);
        }
    }

    // Log activity
    await logActivity(null, {
      action: 'debt_payment',
      userId: user.userId,
      username: user.username,
      description: `دفع ${totalPaid.toFixed(2)} جنيه من دين العميل "${name}"`,
      metadata: {
        debtorName: name,
        paymentAmount: totalPaid,
        requestedAmount: payAmount
      }
    });

    return NextResponse.json(
      { message: "تم الدفع وتسجيل الخصم", totalPaid },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/debt error:", error);
    return NextResponse.json(
      { message: "فشل في تحديث الديون: " + error.message },
      { status: 500 }
    );
  }
}
