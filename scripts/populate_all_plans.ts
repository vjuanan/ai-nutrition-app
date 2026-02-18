import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the meal structure for each day
const mealStructure: Record<string, { name: string; quantity: number }[]> = {
    'Desayuno': [
        { name: 'Huevo Entero', quantity: 3 },
        { name: 'Avena Cruda', quantity: 60 },
        { name: 'Banana', quantity: 1 },
        { name: 'Leche Entera', quantity: 200 },
    ],
    'Almuerzo': [
        { name: 'Pechuga de Pollo', quantity: 200 },
        { name: 'Arroz Blanco Cocido', quantity: 150 },
        { name: 'Brócoli', quantity: 100 },
        { name: 'Aceite de Oliva', quantity: 10 },
    ],
    'Pre-Entreno': [
        { name: 'Yogur Griego', quantity: 150 },
        { name: 'Banana', quantity: 1 },
        { name: 'Granola', quantity: 30 },
    ],
    'Cena': [
        { name: 'Salmón', quantity: 180 },
        { name: 'Batata Cocida', quantity: 200 },
        { name: 'Espinaca', quantity: 100 },
        { name: 'Palta', quantity: 50 },
    ],
};

async function populateAllMikeIsraelPlans() {
    console.log('🔧 Populating ALL Mike Israetel plans...\n');

    // Ensure Arroz Blanco Cocido exists
    const { data: arData } = await supabase.from('foods').select('id').eq('name', 'Arroz Blanco Cocido').single();
    if (!arData) {
        console.log('⚠️  Arroz Blanco Cocido not found, creating...');
        await supabase.from('foods').insert({
            name: 'Arroz Blanco Cocido',
            calories: 130,
            protein: 2.7,
            carbs: 28,
            fats: 0.3,
            unit: 'g',
            serving_size: 100
        });
        console.log('✅ Created Arroz Blanco Cocido');
    }

    // Find ALL Mike Israetel plans
    const { data: plans } = await supabase
        .from('nutritional_plans')
        .select('id, name, user_id')
        .ilike('name', '%Mike Israetel%');

    if (!plans || plans.length === 0) {
        console.error('❌ No plans found!');
        process.exit(1);
    }

    console.log(`Found ${plans.length} plans to populate\n`);

    // Pre-fetch all food IDs
    const foodNames = Array.from(new Set(
        Object.values(mealStructure).flatMap(items => items.map(i => i.name))
    ));

    const foodMap: Record<string, string> = {};
    for (const name of foodNames) {
        const { data } = await supabase
            .from('foods')
            .select('id')
            .eq('name', name)
            .single();

        if (data) {
            foodMap[name] = data.id;
        } else {
            console.log(`⚠️  Food not found: ${name}`);
        }
    }

    for (const plan of plans) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Processing: ${plan.name} (${plan.id})`);
        console.log(`${'='.repeat(60)}`);

        // Get days for this plan
        let { data: days } = await supabase
            .from('plan_days')
            .select('id, name, order')
            .eq('plan_id', plan.id)
            .order('order');

        // Create days if they don't exist
        if (!days || days.length === 0) {
            console.log('  ⚠️  No days - creating 7 days...');
            const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const createdDays = [];
            for (let i = 0; i < dayNames.length; i++) {
                const { data: newDay } = await supabase
                    .from('plan_days')
                    .insert({ plan_id: plan.id, name: dayNames[i], day_of_week: i === 6 ? 0 : i + 1, order: i })
                    .select('id, name, order')
                    .single();
                if (newDay) createdDays.push(newDay);
            }
            days = createdDays;
        }

        // Process days
        for (const day of days!) {
            console.log(`\n  📆 ${day.name}`);

            // Get meals for this day
            let { data: meals } = await supabase
                .from('meals')
                .select('id, name')
                .eq('day_id', day.id);

            // Create meals if they don't exist
            if (!meals || meals.length === 0) {
                console.log('    Creating meals...');
                const mealNames = Object.keys(mealStructure);
                const times: Record<string, string> = {
                    'Desayuno': '08:00', 'Almuerzo': '13:00',
                    'Pre-Entreno': '16:00', 'Cena': '20:00'
                };
                meals = [];
                for (let i = 0; i < mealNames.length; i++) {
                    const { data: newMeal } = await supabase
                        .from('meals')
                        .insert({ day_id: day.id, name: mealNames[i], order: i, time: times[mealNames[i]] })
                        .select('id, name')
                        .single();
                    if (newMeal) meals.push(newMeal);
                }
            }

            for (const meal of meals!) {
                const items = mealStructure[meal.name];
                if (!items) {
                    console.log(`    ⏭️  ${meal.name} - no template items defined`);
                    continue;
                }

                // Delete existing meal_items to avoid duplicates
                await supabase.from('meal_items').delete().eq('meal_id', meal.id);

                // Insert new items
                let insertedCount = 0;
                for (let i = 0; i < items.length; i++) {
                    const foodId = foodMap[items[i].name];
                    if (!foodId) continue;

                    const { error } = await supabase
                        .from('meal_items')
                        .insert({
                            meal_id: meal.id,
                            food_id: foodId,
                            quantity: items[i].quantity,
                            order: i // Adding order field
                        });

                    if (!error) insertedCount++;
                    else console.error(`Error adding item: ${error.message}`);
                }
                console.log(`    🍽️  ${meal.name}: ${insertedCount}/${items.length} items`);
            }
        }
    }

    console.log('\n\n✨ All plans populated!');
}

populateAllMikeIsraelPlans()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
