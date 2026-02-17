
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('URL:', supabaseUrl);

async function formatTable(data: any[]) {
    if (!data || data.length === 0) return 'No data';
    // Simple table format
    const keys = Object.keys(data[0]);
    const header = keys.join(' | ');
    const rows = data.map(row => keys.map(k => {
        let val = row[k];
        if (typeof val === 'object') val = JSON.stringify(val).substring(0, 20);
        return String(val).padEnd(10);
    }).join(' | '));
    return [header, ...rows].join('\n');
}

async function debug() {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get a plan ID (any plan)
    const { data: plans, error: planError } = await adminClient
        .from('nutritional_plans')
        .select('id, name, user_id')
        .limit(1);

    if (planError || !plans?.length) {
        console.error('Error fetching plans or no plans found:', planError);
        return;
    }

    const plan = plans[0];
    console.log(`\nTesting with Plan: ${plan.name} (${plan.id})`);
    console.log(`Owner ID: ${plan.user_id}`);

    // 2. Fetch Days via Admin (Should succeed)
    const { data: adminDays, error: adminError } = await adminClient
        .from('plan_days')
        .select('*')
        .eq('plan_id', plan.id);

    console.log('\n[ADMIN] Days found:', adminDays?.length);
    if (adminError) console.error('[ADMIN] Error:', adminError.message);

    // 3. User Simulation?
    // We cannot easily simulate the user without a password/token.
    // BUT we can check if there are RLS policies enabled.

    // Query pg_policies via RPC or raw query if allowed?
    // Or just try to select as an anonymous user (should fail or return nothing if RLS is on and no public policy)

    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: anonDays, error: anonError } = await anonClient
        .from('plan_days')
        .select('*')
        .eq('plan_id', plan.id);

    console.log('\n[ANON] Days found:', anonDays?.length); // Should be 0 if RLS is on
    if (anonError) console.error('[ANON] Error:', anonError.message);

    // 4. Check policies directly if possible
    // We can't easily check policies without SQL access. But let's check for the "User" attempting to read their own plan.
    // If I can't sign in, I can't verify AS the user.
    // But I can assume if Admin sees it and the App doesn't, it's RLS.

    console.log('\nHypothesis: If Admin sees days but App does not, RLS for "plan_days" is likely missing a SELECT policy for the owner.');

}

debug().catch(console.error);
