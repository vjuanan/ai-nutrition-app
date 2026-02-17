import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSave() {
    // 1. Get a plan to test (Specific User Plan)
    const targetPlanId = '1bc64a2d-17e2-478f-ac98-19fbf8b626fc';
    const { data: plans } = await supabase
        .from('nutritional_plans')
        .select('*')
        .eq('id', targetPlanId);

    if (!plans || plans.length === 0) {
        console.error('No plan found');
        return;
    }

    const plan = plans[0];
    console.log('Testing with plan:', plan.name, plan.id);

    // 2. Get a Day (Sábado or similar)
    const { data: days } = await supabase
        .from('plan_days')
        .select('*')
        .eq('plan_id', plan.id)
        .ilike('name', 'Lunes') // Use 'Lunes'
        .single();

    if (!days) {
        console.error('Day not found');
        return;
    }

    const day = days;
    console.log('Testing with day:', day.name, day.id);

    // 3. Mock the payload that "PlanEditor" sends
    // We want to simulate:
    // - Deleting meals
    // - Inserting new meal
    // - Inserting item

    // Mock Data
    const mockMeal = {
        name: 'Cena Debug',
        time: '21:00:00',
        order: 0,
        items: [
            {
                // Simulate missing top-level food_id, but present inside food object
                food_id: undefined,
                quantity: 100,
                food: {
                    id: '6ca66cba-da25-46fd-9968-385d2da9001b', // Banana ID (approx - will fetch real one)
                }
            }
        ]
    };

    // Fetch real Banana ID
    const { data: food } = await supabase.from('foods').select('id').ilike('name', 'Banana').limit(1).single();
    if (food) {
        mockMeal.items[0].food.id = food.id;
        console.log('Using food ID:', food.id);
    } else {
        console.log('Banana not found, skipping item test');
    }

    // REPLICATE savePlanChanges LOGIC MANUALLY TO SEE ERROR
    try {
        console.log('--- STARTING TRANSACTION SIMULATION ---');

        // 1. Update Day (Skip for now, usually safe)

        // 2. DELETE existing meals
        console.log('Deleting meals for day:', day.id);
        const { error: deleteError } = await supabase.from('meals').delete().eq('day_id', day.id);
        if (deleteError) throw deleteError;
        console.log('Meals deleted.');

        // 3. INSERT new meal
        console.log('Inserting meal...');
        const { data: insertedMeal, error: mealError } = await supabase
            .from('meals')
            .insert({
                day_id: day.id,
                name: mockMeal.name,
                time: mockMeal.time,
                order: mockMeal.order
            })
            .select()
            .single();

        if (mealError) {
            console.error('MEAL INSERT ERROR:', mealError);
            throw mealError;
        }
        console.log('Meal inserted:', insertedMeal.id);

        // 4. INSERT items
        console.log('Inserting items...');

        // LOGIC FROM LIB/ACTIONS.TS
        const itemsToInsert = mockMeal.items.map((item: any, idx: number) => ({
            meal_id: insertedMeal.id,
            food_id: item.food_id || item.food?.id, // THE FIX
            quantity: item.quantity,
            order: idx
            // unit removed
        }));

        console.log('Items payload:', itemsToInsert);

        const { error: itemsError } = await supabase
            .from('meal_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('ITEM INSERT ERROR:', itemsError);
            throw itemsError;
        }
        console.log('Items inserted successfully.');

    } catch (error) {
        console.error('CAUGHT ERROR:', error);
    }
}

debugSave();
