import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';

export async function GET(req) {
    try {
        // التحقق من المستخدم
        const user = await verifyToken(req.headers);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        // جلب parameters من URL
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // نوع المعاملة: 'sale', 'return', 'all'
        const days = parseInt(searchParams.get('days')) || 30; // عدد الأيام (افتراضي 30)
        const limit = parseInt(searchParams.get('limit')) || 50; // الحد الأقصى (افتراضي 50)
        const showReturned = searchParams.get('showReturned') === 'true'; // هل نظهر الفواتير المرتجعة؟

        // حساب تاريخ البداية (منذ X يوم)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const startDateStr = startDate.toISOString();

        // 🔥 جلب جميع المرتجعات عشان نعرف الفواتير اللي اتعملها return
        const { data: returnsData } = await supabase
            .from('winnings')
            .select('*')
            .eq('transaction_type', 'return')
            .gte('date', startDateStr);

        const returns = returnsData || [];

        // مجموعة IDs الفواتير الأصلية اللي اتعملها return
        const returnedTransactionIds = new Set();
        returns.forEach(ret => {
            if (ret.metadata?.originalTransactionId) {
                returnedTransactionIds.add(ret.metadata.originalTransactionId.toString());
            }
        });

        let transactions = [];

        // جلب المعاملات حسب النوع
        if (type === 'sale' || type === 'all') {
            // جلب مبيعات الكاش من Winning
            let cashSalesQuery = supabase
                .from('winnings')
                .select('*')
                .eq('transaction_type', 'in')
                .gte('date', startDateStr);

            const { data: cashSalesData } = await cashSalesQuery
                .order('date', { ascending: false })
                .limit(limit);
            
            const cashSales = cashSalesData || [];

            // جلب المبيعات الآجلة من Orders
            const { data: creditSalesData } = await supabase
                .from('orders')
                .select('*, debtors(name)')
                .gte('created_at', startDateStr)
                .order('created_at', { ascending: false })
                .limit(limit);

            const creditSales = creditSalesData || [];

            // تنسيق مبيعات الكاش
            const formattedCashSales = cashSales.map(sale => {
                // هل الفاتورة دي مرتجعة؟
                const isReturned = returnedTransactionIds.has(sale.id.toString()) || sale.metadata?.isReturned;
                
                // Skip returned if not requested
                if (!showReturned && isReturned) return null;

                return {
                    _id: sale.id,
                    invoiceNumber: sale.invoice_number || `SALE-${sale.id.toString().slice(-6)}`,
                    date: sale.date,
                    totalAmount: sale.amount,
                    paymentType: 'cash',
                    transactionType: 'sale',
                    items: extractItemsFromReason(sale.reason, sale.amount),
                    isReturned,
                    metadata: {
                        originalTransaction: sale
                    }
                };
            }).filter(Boolean);

            // تنسيق المبيعات الآجلة
            const formattedCreditSales = creditSales.map(order => {
                const isReturned = false;
                
                return {
                    _id: order.id,
                    invoiceNumber: `DEBT-${order.id.toString().slice(-6)}`,
                    date: order.created_at,
                    totalAmount: order.total,
                    paymentType: 'credit',
                    transactionType: 'sale',
                    debtorName: order.debtors?.name,
                    items: order.items || [],
                    isReturned,
                    metadata: {
                        originalOrder: order
                    }
                };
            });

            transactions = [...formattedCashSales, ...formattedCreditSales];
        }

        if (type === 'return' || type === 'all') {
            const formattedReturns = returns.map(ret => ({
                _id: ret.id,
                invoiceNumber: ret.invoice_number || `RET-${ret.id.toString().slice(-6)}`,
                date: ret.date,
                totalAmount: Math.abs(ret.amount), // القيمة المطلقة للمرتجع
                paymentType: 'return',
                transactionType: 'return',
                originalInvoiceNumber: ret.metadata?.originalInvoiceNumber,
                items: ret.metadata?.items || [],
                reason: ret.reason
            }));

            transactions = [...transactions, ...formattedReturns];
        }

        // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({
            success: true,
            transactions,
            metadata: {
                total: transactions.length,
                type,
                days,
                startDate: startDateStr,
                showReturned,
                returnedCount: returnedTransactionIds.size
            }
        });

    } catch (error) {
        console.error('GET /api/transactions error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// دالة مساعدة لاستخراج المنتجات من reason
function extractItemsFromReason(reason, totalAmount) {
    try {
        if (!reason) return [];
        
        const items = [];
        const parts = reason.split(' و ');
        
        parts.forEach(part => {
            const match = part.match(/(\d+)\s+(.*?)\s+(.+)/);
            if (match) {
                items.push({
                    quantity: parseInt(match[1]),
                    unit: match[2],
                    name: match[3],
                    price: totalAmount / parts.length // تقريبي
                });
            }
        });
        
        return items;
    } catch (e) {
        console.error('Error extracting items:', e);
        return [];
    }
}