
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log('--- Inspecting Schema ---');
    // 0. List all tables
    const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    // Note: Supabase JS doesn't support querying information_schema easily with simple `from`.
    // Instead use RPC or just guess. 
    // BUT wait, `from('information_schema.tables')` *might* work depending on config, but usually fails.

    // Better strategy: Try to select from likely names.
    // We tried `plan_meals`, `meal_foods`.
    // Maybe `meals`? `meal_items`? `plan_items`?

    // Let's try to infer from `plan_days` foreign keys if possible?
    // Not easily.

    // Let's just try more names.

    // 1. Clients
    const { data: clients, error: clientError } = await supabase.from('clients').select('*').limit(1);
    if (clientError) console.error('Error selecting clients:', clientError.message);
    else if (clients.length > 0) {
        console.log('Clients columns:', Object.keys(clients[0]));
        console.log('Sample client:', clients[0]);
    } else {
        console.log('Clients table is empty or exists.');
    }

    // 2. Coaches
    const { data: coaches, error: coachError } = await supabase.from('coaches').select('*').limit(1);
    if (coachError) console.error('Error selecting coaches:', coachError.message);
    else if (coaches.length > 0) {
        console.log('Coaches columns:', Object.keys(coaches[0]));
    } else {
        console.log('Coaches table is empty.');
    }


    // 3. Profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').limit(1);
    if (profileError) console.error('Error selecting profiles:', profileError.message);
    else if (profiles.length > 0) {
        console.log('Profiles columns:', Object.keys(profiles[0]));
    }


    // 4. Nutritional Plans
    const { data: plans, error: plansError } = await supabase.from('nutritional_plans').select('*').limit(1);
    if (plansError) console.error('Error selecting nutritional_plans:', plansError.message);
    else if (plans.length > 0) {
        console.log('Plans columns:', Object.keys(plans[0]));
        console.log('Sample plan:', plans[0]);
    } else {
        console.log('Nutritional Plans table is empty.');
    }

    // 5. Plan Days
    const { data: days, error: daysError } = await supabase.from('plan_days').select('*').limit(1);
    if (daysError) console.error('Error selecting plan_days:', daysError.message);
    else if (days.length > 0) {
        console.log('Plan Days columns:', Object.keys(days[0]));
        console.log('Sample day:', days[0]);
    } else {
        console.log('Plan Days table is empty.');
    }

    // 6. Foods
    const { data: foodsData, error: foodsError } = await supabase.from('foods').select('*').limit(1);
    if (foodsError) console.error('Error selecting foods:', foodsError.message);
    else if (foodsData.length > 0) {
        console.log('Foods columns:', Object.keys(foodsData[0]));
        console.log('Sample food:', foodsData[0]);
    } else {
        console.log('Foods table is empty.');
    }

    // 7. Meals
    const { data: mealsCols, error: mealsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'meals');

    if (mealsError) console.error('Error selecting meals columns:', mealsError.message);
    else console.log('Meals Columns:', mealsCols.map(c => c.column_name));

    // 8. Meal Items
    const { data: mealItemsCols, error: mealItemsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'meal_items');

    if (mealItemsError) console.error('Error selecting meal_items columns:', mealItemsError.message);
    else console.log('Meal Items Columns:', mealItemsCols.map(c => c.column_name));

}

inspect();
