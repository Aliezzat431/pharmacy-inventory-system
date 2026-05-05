import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/verifyToken';
import { supabase } from '@/app/lib/supabase';

export async function GET(request) {
    try {
        const user = await verifyToken(request.headers);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action'); // Filter by action type
        const userIdFilter = searchParams.get('userId'); // Filter by user
        const search = searchParams.get('search'); // Search in description
        const startDate = searchParams.get('startDate'); // Filter by date range
        const endDate = searchParams.get('endDate');

        // Build query
        let query = supabase
            .from('activities')
            .select('*', { count: 'exact' });

        if (action && action !== 'all') {
            query = query.eq('action', action);
        }

        if (userIdFilter && userIdFilter !== 'all') {
            query = query.eq('user_id', userIdFilter);
        }

        if (search) {
            query = query.ilike('description', `%${search}%`);
        }

        if (startDate) {
            query = query.gte('created_at', new Date(startDate).toISOString());
        }
        
        if (endDate) {
            query = query.lte('created_at', new Date(endDate).toISOString());
        }

        // Calculate pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Execute query
        const { data: activities, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Map fields to match what frontend expects
        const formattedActivities = activities.map(act => ({
            ...act,
            _id: act.id,
            userId: act.user_id,
            createdAt: act.created_at
        }));

        console.log(`Found ${activities.length} activities. Total: ${count}`);

        return NextResponse.json({
            success: true,
            activities: formattedActivities,
            pagination: {
                page,
                limit,
                total: count,
                pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('GET /api/activities error:', error);
        return NextResponse.json(
            { error: 'خطأ في الخادم' },
            { status: 500 }
        );
    }
}
