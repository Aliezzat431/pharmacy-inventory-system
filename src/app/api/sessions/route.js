import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/verifyToken';
import { supabase } from '@/app/lib/supabase';

export async function GET(request) {
    try {
        const user = await verifyToken(request.headers);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only master role can view sessions log
        if (user.role !== 'master') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const userId = searchParams.get('userId');
        const shiftType = searchParams.get('shiftType');
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build query
        let queryBuilder = supabase
            .from('sessions')
            .select('*', { count: 'exact' });

        if (userId && userId !== 'all') {
            queryBuilder = queryBuilder.eq('user_id', userId);
        }

        if (shiftType && shiftType !== 'all') {
            queryBuilder = queryBuilder.eq('shift_type', shiftType);
        }

        if (status && status !== 'all') {
            queryBuilder = queryBuilder.eq('status', status);
        }

        if (startDate) {
            queryBuilder = queryBuilder.gte('start_time', new Date(startDate).toISOString());
        }
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            queryBuilder = queryBuilder.lte('start_time', endDateTime.toISOString());
        }

        // Calculate pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Execute query
        const { data: sessions, count: total, error } = await queryBuilder
            .order('start_time', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            sessions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil((total || 0) / limit)
            }
        });

    } catch (error) {
        console.error('GET /api/sessions error:', error);
        return NextResponse.json(
            { error: 'خطأ في جلب بيانات الجلسات: ' + error.message },
            { status: 500 }
        );
    }
}
