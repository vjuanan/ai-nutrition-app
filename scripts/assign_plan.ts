
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignPlan() {
    console.log('--- Starting Assign Plan Script ---');

    // 1. Get Admin
    const { data: { users: [adminUser] }, error: adminError } = await supabase.auth.admin.listUsers();
    const admin = (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === 'admin@epnstore.com.ar');
    if (!admin) throw new Error('Admin not found');
    console.log(`Admin Link: ${admin.id}`);

    // 2. Get Patient Client Record
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'test_israetel@epnstore.com.ar')
        .single();

    if (!client) throw new Error('Client record for test_israetel not found. Run link_patient.ts first.');
    console.log(`Client Found: ${client.id}`);

    // 3. Find Template Plan
    const { data: templates, error: templateError } = await supabase
        .from('nutritional_plans')
        .select('*')
        .ilike('name', '%Hypertrophy%')
        .limit(1);

    if (!templates || templates.length === 0) throw new Error('Template plan not found');
    const sourcePlan = templates[0];
    console.log(`Source Plan Found: ${sourcePlan.name} (${sourcePlan.id})`);

    // 4. Create New Plan
    const { data: newPlan, error: createPlanError } = await supabase
        .from('nutritional_plans')
        .insert({
            user_id: admin.id,
            client_id: client.id,
            name: `Plan: ${sourcePlan.name} (Assigned)`,
            description: sourcePlan.description,
            is_active: true,
            type: 'assigned'
        })
        .select()
        .single();

    if (createPlanError) {
        console.error('Error creating new plan:', createPlanError);
        return;
    }
    console.log(`New Plan Created: ${newPlan.id}`);

    // 5. Duplicate Days
    const { data: sourceDays, error: daysError } = await supabase
        .from('plan_days')
        .select('*')
        .eq('plan_id', sourcePlan.id);


    if (!sourceDays || sourceDays.length === 0) {
        console.log('No days to copy. Generating default 7 days...');
        const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const defaultDays = weekDays.map((name, i) => ({
            plan_id: newPlan.id,
            day_of_week: i,
            name: name,
            target_calories: 2500, // Default values for "High Protein" style
            target_protein: 200,
            target_carbs: 250,
            target_fats: 80,
            order: i
        }));

        const { data: createdDays, error: createDaysError } = await supabase
            .from('plan_days')
            .insert(defaultDays)
            .select();

        if (createDaysError) console.error('Error creating default days:', createDaysError);
        else console.log(`Created ${createdDays.length} default days successfully.`);

        console.log('--- Assignment Complete ---');
        return;
    }

    const newDaysPayload = sourceDays.map(day => ({
        plan_id: newPlan.id,
        day_of_week: day.day_of_week,
        name: day.name,
        target_calories: day.target_calories,
        target_protein: day.target_protein,
        target_carbs: day.target_carbs,
        target_fats: day.target_fats,
        order: day.order
    }));

    const { data: createdDays, error: createDaysError } = await supabase
        .from('plan_days')
        .insert(newDaysPayload)
        .select();

    if (createDaysError) {
        console.error('Error duplicating days:', createDaysError);
    } else {
        console.log(`Duplicated ${createdDays.length} days successfully.`);
    }

    console.log('--- Assignment Complete ---');
}

assignPlan();
