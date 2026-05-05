import { supabase } from './supabase';

/**
 * Generate a unique invoice number with auto-incrementing counter using Supabase
 * @param {Object} conn - (Unused in Supabase implementation, kept for compatibility)
 * @param {string} type - Type of invoice: 'sale', 'return', 'charity'
 * @param {Object} session - (Unused in Supabase implementation, kept for compatibility)
 * @returns {Promise<string>} Generated invoice number (e.g., "SALE-001")
 */
export async function generateInvoiceNumber(conn, type, session = null) {
    const prefixMap = {
        sale: 'SALE',
        return: 'RET',
        charity: 'CHR'
    };

    const prefix = prefixMap[type];
    if (!prefix) {
        throw new Error(`Invalid invoice type: ${type}`);
    }

    try {
        // In Supabase/Postgres, we can use an 'upsert' with a increment if supported or a simple select+update
        
        // 1. Try to get the current counter
        let { data: counter, error } = await supabase
            .from('counters')
            .select('current_value')
            .eq('name', type)
            .single();

        let newValue = 1;
        if (counter) {
            newValue = (counter.current_value || 0) + 1;
        }

        const { data: updated, error: updateError } = await supabase
            .from('counters')
            .upsert({
                name: type,
                current_value: newValue,
                prefix: prefix,
                last_updated: new Date().toISOString()
            }, { onConflict: 'name' })
            .select()
            .single();

        if (updateError) throw updateError;

        // Format: PREFIX-XXX (zero-padded to 3 digits)
        const formattedNumber = updated.current_value.toString().padStart(3, '0');
        return `${prefix}-${formattedNumber}`;

    } catch (error) {
        console.error('Error generating invoice number:', error);
        throw new Error('Failed to generate invoice number');
    }
}
