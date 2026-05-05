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

        // Build query
        let query = supabase
            .from('winnings')
            .select('*')
            .not('invoice_number', 'is', null)
            .neq('invoice_number', '');

        // Optional filters from query params
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const supplier = searchParams.get("supplier");
        const invoiceNumber = searchParams.get("invoiceNumber");
        const transactionType = searchParams.get("transactionType");

        if (startDate) {
            query = query.gte('date', new Date(startDate).toISOString());
        }
        if (endDate) {
            query = query.lte('date', new Date(endDate).toISOString());
        }

        if (supplier) {
            query = query.eq('supplier', supplier);
        }

        if (invoiceNumber) {
            query = query.ilike('invoice_number', `%${invoiceNumber}%`);
        }

        if (transactionType) {
            query = query.eq('transaction_type', transactionType);
        }

        // Sorting
        const sortBy = searchParams.get("sortBy") || "date";
        const sortOrder = searchParams.get("sortOrder") === "asc" ? { ascending: true } : { ascending: false };

        // Map sortBy if necessary
        const mappedSortBy = sortBy === 'invoiceNumber' ? 'invoice_number' : (sortBy === 'transactionType' ? 'transaction_type' : sortBy);

        const { data: invoices, error } = await query.order(mappedSortBy, sortOrder);

        if (error) throw error;

        // Get unique suppliers for filter dropdown
        const { data: supplierData } = await supabase
            .from('winnings')
            .select('supplier')
            .not('supplier', 'is', null)
            .neq('supplier', '');

        const uniqueSuppliers = [...new Set(supplierData?.map(s => s.supplier) || [])].sort();

        // Calculate statistics (master only)
        let stats = {
            totalInvoices: invoices.length,
            totalAmount: 0,
            byType: {
                in: 0,
                out: 0,
                suspended: 0
            }
        };

        if (user.role === 'master') {
            invoices.forEach(inv => {
                stats.totalAmount += Number(inv.amount || 0);
                if (inv.transaction_type && stats.byType[inv.transaction_type] !== undefined) {
                    stats.byType[inv.transaction_type]++;
                }
            });
        }

        // Format data based on role
        const formattedInvoices = invoices.map(inv => {
            const baseData = {
                _id: inv.id,
                id: inv.id,
                date: inv.date,
                invoiceNumber: inv.invoice_number,
                isVirtualInvoice: inv.metadata?.is_virtual_invoice || false,
                supplier: inv.supplier || "-",
                transactionType: inv.transaction_type,
                reason: inv.reason
            };

            // Only include amount for master users
            if (user.role === 'master') {
                baseData.amount = inv.amount;
            }

            return baseData;
        });

        return NextResponse.json({
            success: true,
            invoices: formattedInvoices,
            suppliers: uniqueSuppliers,
            stats: user.role === 'master' ? stats : { totalInvoices: invoices.length },
            userRole: user.role
        });

    } catch (error) {
        console.error("Invoices GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch invoices" },
            { status: 500 }
        );
    }
}
