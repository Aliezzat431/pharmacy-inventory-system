import { supabase } from '@/app/lib/supabase';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { validateCompanyName } from '@/app/lib/ai/company-validator';

export async function POST(req) {
    try {
        const user = await verifyToken(req.headers);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { companyName } = await req.json();
        if (!companyName) {
            return NextResponse.json(
                { success: false, message: "Company name is required" },
                { status: 400 }
            );
        }

        // Fetch all existing company names from Supabase
        const { data: allCompanies, error: fetchError } = await supabase
            .from('companies')
            .select('name');

        if (fetchError) throw fetchError;

        const existingNames = allCompanies ? allCompanies.map(c => c.name) : [];

        if (existingNames.length === 0) {
            return NextResponse.json({
                isDuplicate: false,
                reason: "No companies found in database yet."
            });
        }

        const validation = await validateCompanyName(companyName, existingNames);

        return NextResponse.json(validation);

    } catch (error) {
        console.error("AI Company Suggestion Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error: " + error.message },
            { status: 500 }
        );
    }
}
