import { supabase } from './supabase';

/**
 * Log an activity to the database using Supabase
 * @param {Object} conn - (Unused in Supabase implementation, kept for compatibility)
 * @param {Object} params - Activity parameters
 */
export async function logActivity(conn, { action, userId, username, description, metadata = {} }) {
    try {
        const { error } = await supabase
            .from('activities')
            .insert({
                action,
                user_id: userId || null,
                username: username || 'النظام',
                description,
                metadata
            });

        if (error) throw error;
    } catch (error) {
        console.error('Failed to log activity:', error.message);
    }
}
