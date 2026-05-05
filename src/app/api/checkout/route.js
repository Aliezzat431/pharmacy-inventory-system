import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";

export async function POST(req) {
    try {
        // التحقق من المستخدم
        const user = await verifyToken(req.headers);

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized"
                },
                { status: 401 }
            );
        }

        const body = await req.json();

        const {
            items = [],
            isSadaqah = false,
            paymentMethod = "cash"
        } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "السلة فارغة"
                },
                { status: 400 }
            );
        }

        // حساب الإجمالي
        const totalAmount = items.reduce((acc, item) => {
            return acc + Number(item.total || (item.price * item.quantity));
        }, 0);

        // إنشاء نص الفاتورة
        const reason = items
            .map((item) => {
                return `${item.quantity} ${item.unit || ""} ${item.name}`;
            })
            .join(" و ");

        // رقم فاتورة
        const invoiceNumber = `INV-${Date.now()}`;

        // تجهيز metadata
        const metadata = {
            items: items.map((item) => ({
                productId: item._id,
                batchId: item.batchId,
                barcode: item.barcode,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                price: item.price,
                total: item.total,
                expiry: item.expiry
            })),
            isSadaqah,
            paymentMethod,
            cashier: {
                id: user.id,
                name: user.name || user.username || "Unknown"
            }
        };

        // حفظ العملية
        const { data, error } = await supabase
            .from("winnings")
            .insert([
                {
                    amount: totalAmount,
                    reason,
                    transaction_type: "in",
                    invoice_number: invoiceNumber,
                    metadata,
                    date: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);

            return NextResponse.json(
                {
                    success: false,
                    error: "فشل حفظ عملية البيع"
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "تمت عملية البيع بنجاح",
                transaction: data
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("POST /api/checkout error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "حدث خطأ أثناء الدفع"
            },
            { status: 500 }
        );
    }
}