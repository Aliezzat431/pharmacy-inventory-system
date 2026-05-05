import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';

export async function GET(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('winnings')
            .select('supplier')
            .not('supplier', 'is', null)
            .neq('supplier', '');

        if (error) throw error;

        // Get unique suppliers using a Set
        const uniqueSuppliers = [...new Set(data.map(item => item.supplier))].sort();

        return NextResponse.json({ success: true, suppliers: uniqueSuppliers });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
