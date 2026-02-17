import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Template plan (Hypertrophy Mike Israetel)
const TEMPLATE_PLAN_NAME = 'Template - Hypertrophy Mike Israetel';

// Define the meal structure for each day
const mealStructure = {
    'Desayuno': [
        { name: 'Huevo Entero', quantity: 3, unit: 'unit' },
        { name: 'Avena Cruda', quantity: 60, unit: 'g' },
        { name: 'Banana', quantity: 1, unit: 'unit' },
        { name: 'Leche Entera', quantity: 200, unit: 'ml' },
    ],
    'Almuerzo': [
        { name: 'Pechuga de Pollo', quantity: 200, unit: 'g' },
        { name: 'Arroz Blanco Cocido', quantity: 150, unit: 'g' },
        { name: 'Brócoli', quantity: 100, unit: 'g' },
        { name: 'Aceite de Oliva', quantity: 10, unit: 'ml' },
    ],
    'Pre-Entreno': [
        { name: 'Yogur Griego', quantity: 150, unit: 'g' },
        { name: 'Banana', quantity: 1, unit: 'unit' },
        { name: 'Granola', quantity: 30, unit: 'g' },
    ],
    'Cena': [
        { name: 'Salmón', quantity: 180, unit: 'g' },
        { name: 'Batata Cocida', quantity: 200, unit: 'g' },
        { name: 'Espinaca', quantity: 100, unit: 'g' },
        { name: 'Palta', quantity: 50, unit: 'g' },
    ],
};

async function populateTemplate() {
    console.log('🥗 Starting template population...\n');

    try {
        // Step 1: Find the template plan
        console.log(`🔍 Looking for plan: "${TEMPLATE_PLAN_NAME}"`);
        const { data: plans, error: plansError } = await supabase
            .from('nutritional_plans')
            .select('id, name')
            .ilike('name', `%${TEMPLATE_PLAN_NAME}%`)
            .limit(1);

        if (plansError) throw plansError;
        if (!plans || plans.length === 0) {
            console.error(`❌ Template plan "${TEMPLATE_PLAN_NAME}" not found!`);
            process.exit(1);
        }

        const planId = plans[0].id;
        console.log(`✅ Found plan: ${plans[0].name} (${planId})\n`);

        // Step 2: Get all days for this plan
        console.log('📅 Fetching days for this plan...');
        const { data: days, error: daysError } = await supabase
            .from('plan_days')
            .select('id, name, order')
            .eq('plan_id', planId)
            .order('order');

        if (daysError) throw daysError;

        let daysToProcess = days || [];

        if (!days || days.length === 0) {
            console.log('⚠️  No days found, creating 7 days for the plan...\n');

            const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const createdDays = [];

            for (let i = 0; i < dayNames.length; i++) {
                const { data: newDay, error: dayError } = await supabase
                    .from('plan_days')
                    .insert({
                        plan_id: planId,
                        name: dayNames[i],
                        day_of_week: i === 6 ? 0 : i + 1, // Sunday = 0, Monday = 1, etc.
                        order: i,
                    })
                    .select('id, name, order')
                    .single();

                if (dayError) {
                    console.error(`❌ Error creating day ${dayNames[i]}:`, dayError.message);
                } else {
                    console.log(`✅ Created day: ${dayNames[i]}`);
                    createdDays.push(newDay!);
                }
            }

            daysToProcess = createdDays;
        }

        console.log(`✅ Processing ${daysToProcess.length} days\n`);

        // Step 3: For each day, add meals
        for (const day of daysToProcess) {
            console.log(`\n=================================================`);
            console.log(`📆 Day: ${day.name}`);
            console.log(`=================================================\n`);

            // Add each meal type
            let mealOrder = 0;
            for (const [mealName, items] of Object.entries(mealStructure)) {
                console.log(`  🍽️  Adding meal: ${mealName}`);

                // Check if meal already exists
                const { data: existingMeals } = await supabase
                    .from('meals')
                    .select('id')
                    .eq('day_id', day.id)
                    .eq('name', mealName);

                let mealId: string;

                if (existingMeals && existingMeals.length > 0) {
                    mealId = existingMeals[0].id;
                    console.log(`     ℹ️  Meal already exists, using existing meal`);

                    // Delete existing meal items to replace them
                    await supabase
                        .from('meal_items')
                        .delete()
                        .eq('meal_id', mealId);
                } else {
                    // Create the meal
                    const { data: newMeal, error: mealError } = await supabase
                        .from('meals')
                        .insert({
                            day_id: day.id,
                            name: mealName,
                            order: mealOrder++,
                            time: getMealTime(mealName),
                        })
                        .select('id')
                        .single();

                    if (mealError) {
                        console.error(`     ❌ Error creating meal:`, mealError.message);
                        continue;
                    }

                    mealId = newMeal!.id;
                    console.log(`     ✅ Created meal`);
                }

                // Add items to the meal
                for (const item of items) {
                    // Find the food
                    const { data: foods, error: foodError } = await supabase
                        .from('foods')
                        .select('id, name, calories, protein, carbs, fats, unit, serving_size')
                        .eq('name', item.name)
                        .single();

                    if (foodError || !foods) {
                        console.log(`     ⚠️  Food "${item.name}" not found, skipping`);
                        continue;
                    }

                    // Insert meal item
                    const { error: itemError } = await supabase
                        .from('meal_items')
                        .insert({
                            meal_id: mealId,
                            food_id: foods.id,
                            quantity: item.quantity,
                        });

                    if (itemError) {
                        console.log(`     ❌ Error adding "${item.name}":`, itemError.message);
                    } else {
                        const calories = Math.round((foods.calories * item.quantity) / foods.serving_size);
                        console.log(`     ✅ Added: ${item.quantity}${item.unit} ${item.name} (~${calories} kcal)`);
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✨ Template population complete!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('💥 Fatal error:', error);
        throw error;
    }
}

function getMealTime(mealName: string): string {
    const times: Record<string, string> = {
        'Desayuno': '08:00',
        'Almuerzo': '13:00',
        'Pre-Entreno': '16:00',
        'Cena': '20:00',
    };
    return times[mealName] || '';
}

// Run the population
populateTemplate()
    .then(() => {
        console.log('\n🎉 Population script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💀 Population script failed:', error);
        process.exit(1);
    });
