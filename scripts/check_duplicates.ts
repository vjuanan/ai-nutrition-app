import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const planId = '1bc64a2d-17e2-478f-ac98-19fbf8b626fc';

    console.log(`Checking days for plan: ${planId}`);

    const { data: days, error } = await supabase
        .from('plan_days')
        .select('*')
        .eq('plan_id', planId)
        .order('order');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${days.length} days.`);

    // Check for duplicate names or orders
    const names = new Map();
    days.forEach(day => {
        if (names.has(day.name)) {
            console.error(`🚨 DUPLICATE FOUND: ${day.name}`);
            console.log(`  - ID 1: ${names.get(day.name).id}`);
            console.log(`  - ID 2: ${day.id}`);
        } else {
            names.set(day.name, day);
        }
        console.log(`Day: ${day.name} (Order: ${day.order}) - ID: ${day.id}`);
    });

}

checkDuplicates();
