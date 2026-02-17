
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPlans() {
    console.log('--- Debugging Plans Fetching ---');

    const adminEmail = 'vjuanan@gmail.com';
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminUser = users.find(u => u.email === adminEmail);

    if (!adminUser) { console.error('Admin user not found'); return; }
    console.log(`User ID: ${adminUser.id}`);

    // 1. Simple Select
    const { data: simplePlans, error: simpleError } = await supabase
        .from('nutritional_plans')
        .select('*');

    console.log(`Simple Count: ${simplePlans?.length}`);
    if (simpleError) console.error('Simple Error:', simpleError);
    if (simplePlans && simplePlans.length > 0) {
        console.log('Sample Plan:', simplePlans[0]);
    }

    // 2. Complex Select (Mimicking getNutritionalPlans)
    console.log('\n--- Mimicking Action Query ---');
    const { data: complexPlans, error: complexError } = await supabase
        .from('nutritional_plans')
        .select('*, client:clients(*), coach:profiles!user_id(full_name)')
        .order('updated_at', { ascending: false });

    if (complexError) {
        console.error('❌ Complex Query Error:', complexError);
    } else {
        console.log(`✅ Complex Query Success. Found: ${complexPlans?.length}`);
        if (complexPlans && complexPlans.length > 0) {
            // console.log(JSON.stringify(complexPlans[0], null, 2));
        }
    }
}

checkPlans();
