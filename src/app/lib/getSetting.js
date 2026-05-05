import { supabase } from "./supabase";

export async function getSetting(conn, key, defaultValue) {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();
        
        if (!error && data) {
            return data.value;
        }
        return defaultValue;
    } catch (err) {
        console.error("getSetting error:", err);
        return defaultValue;
    }
}
