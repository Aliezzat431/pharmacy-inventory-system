import { supabase } from './src/app/lib/supabase.js';

async function checkSchema() {
    const { data, error } = await supabase.from('companies').select('*').limit(1);
    if (error) {
        console.error('Error fetching companies:', error);
    } else {
        console.log('Company columns:', Object.keys(data[0] || {}));
    }

    const { data: sups, error: supErr } = await supabase.from('suppliers').select('*').limit(1);
    if (supErr) {
        console.error('Error fetching suppliers:', supErr);
    } else {
        console.log('Supplier columns:', Object.keys(sups[0] || {}));
    }
}

checkSchema();
