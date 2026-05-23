/**
 * Diagnostic Script: Lists all users, profiles, and tables in Supabase
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars'); process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    console.log('=== SUPABASE DIAGNOSTIC ===');
    console.log('URL:', supabaseUrl);
    
    // 1. List all auth users
    console.log('\n--- AUTH USERS ---');
    const { data: { users }, error: usersErr } = await sb.auth.admin.listUsers();
    if (usersErr) { console.error('Error listing users:', usersErr.message); }
    else {
        console.log(`Total users: ${users.length}`);
        for (const u of users) {
            console.log(`  ${u.email} | confirmed: ${!!u.email_confirmed_at} | role_meta: ${u.user_metadata?.role || 'none'} | id: ${u.id}`);
        }
    }

    // 2. List profiles
    console.log('\n--- PROFILES TABLE ---');
    const { data: profiles, error: profErr } = await sb.from('profiles').select('*');
    if (profErr) { console.error('Error:', profErr.message); }
    else {
        console.log(`Total profiles: ${(profiles || []).length}`);
        for (const p of (profiles || [])) {
            console.log(`  ${p.email} | role: ${p.role} | name: ${p.name} | id: ${p.id}`);
        }
    }

    // 3. Check clinic_profiles table
    console.log('\n--- CLINIC_PROFILES TABLE ---');
    const { data: clinics, error: clinErr } = await sb.from('clinic_profiles').select('*');
    if (clinErr) { console.error('Error (table may not exist):', clinErr.message); }
    else {
        console.log(`Total clinic_profiles: ${(clinics || []).length}`);
        for (const c of (clinics || [])) {
            console.log(`  ${c.clinic_name} | addr: ${c.address} | id: ${c.id}`);
        }
    }

    // 4. Check clinic_patients
    console.log('\n--- CLINIC_PATIENTS TABLE ---');
    const { data: cp, error: cpErr } = await sb.from('clinic_patients').select('*');
    if (cpErr) { console.error('Error:', cpErr.message); }
    else { console.log(`Total clinic_patients: ${(cp || []).length}`); for (const r of (cp || [])) console.log(`  clinic: ${r.clinic_id} | patient: ${r.patient_id}`); }

    // 5. Check clinic_nutritionists
    console.log('\n--- CLINIC_NUTRITIONISTS TABLE ---');
    const { data: cn, error: cnErr } = await sb.from('clinic_nutritionists').select('*');
    if (cnErr) { console.error('Error:', cnErr.message); }
    else { console.log(`Total clinic_nutritionists: ${(cn || []).length}`); for (const r of (cn || [])) console.log(`  clinic: ${r.clinic_id} | nutri: ${r.nutritionist_id}`); }

    // 6. Check nutrition_plans
    console.log('\n--- NUTRITION_PLANS TABLE ---');
    const { data: plans, error: plErr } = await sb.from('nutrition_plans').select('*');
    if (plErr) { console.error('Error:', plErr.message); }
    else { console.log(`Total plans: ${(plans || []).length}`); for (const p of (plans || [])) console.log(`  name: ${p.name} | by: ${p.created_by} | clinic: ${p.clinic_id} | patient: ${p.assigned_patient_id}`); }

    // 7. Assignments
    console.log('\n--- ASSIGNMENTS TABLE ---');
    const { data: assigns, error: asErr } = await sb.from('assignments').select('*');
    if (asErr) { console.error('Error:', asErr.message); }
    else { console.log(`Total assignments: ${(assigns || []).length}`); for (const a of (assigns || [])) console.log(`  patient: ${a.patient_id} | nutri: ${a.nutritionist_id}`); }

    console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

main();
