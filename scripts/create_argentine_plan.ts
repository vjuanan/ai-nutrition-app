
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createArgentinePlan() {
    console.log('--- Creating Argentine Nutrition Plan ---');

    // 1. Get Admin User (to be the owner of the plan scope)
    const { data: { users: [adminUser] } } = await supabase.auth.admin.listUsers();
    // We'll use the first found user or a specific one if needed.
    // Ideally, use the one with 'coach' role or similar.
    if (!adminUser) { console.error('No admin found'); return; }

    // 2. Create Plan Header
    const planName = 'Plan Nutricional - Tradicional Argentino';
    const { data: plan, error: planError } = await supabase
        .from('nutritional_plans')
        .insert({
            user_id: adminUser.id,
            name: planName,
            description: 'Plan balanceado con comidas típicas de Argentina. Incluye opciones como milanesas, asado, pastas y mate.',
            type: 'template',
            is_active: true
        })
        .select()
        .single();

    if (planError) {
        console.error('Error creating plan:', planError.message);
        return;
    }
    console.log(`Plan Created: ${plan.name} (${plan.id})`);

    // 3. Helper to find food IDs
    const findFood = async (namePart: string) => {
        const { data } = await supabase.from('foods').select('id, name').ilike('name', `%${namePart}%`).limit(1).single();
        return data;
    };

    // 4. Define Daily Structure (Simplified for 7 days)
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Pre-fetch some common foods
    const cafe = await findFood('Leche'); // Mate cocido/Cafe w milk logic
    const pan = await findFood('Pan Francés');
    const queso = await findFood('Queso Cremoso');
    const milanesa = await findFood('Milanesa de Carne (Horno)');
    const papa = await findFood('Papa');
    const fruta = await findFood('Manzana');
    const yogur = await findFood('Yogur');
    const fideos = await findFood('Fideos');
    const carne = await findFood('Vacio');
    const asado = await findFood('Asado');
    const ensalada = await findFood('Lechuga');
    const facturas = await findFood('Facturas');

    for (let i = 0; i < days.length; i++) {
        const dayName = days[i];

        // Create Day
        const { data: day, error: dayError } = await supabase
            .from('plan_days')
            .insert({
                plan_id: plan.id,
                day_of_week: i,
                name: dayName,
                order: i,
                target_calories: 2000,
                target_protein: 150,
                target_carbs: 200,
                target_fats: 70
            })
            .select()
            .single();

        if (dayError) { console.error(`Error creating day ${dayName}:`, dayError.message); continue; }

        console.log(`  > Created Day: ${dayName}`);

        // Insert Meals for this day (Example Logic)

        // Desayuno
        if (cafe && pan && queso) {
            const { data: meal, error: mealError } = await supabase.from('meals').insert({
                day_id: day.id,
                name: 'Desayuno',
                order: 0,
                time: '08:00'
            }).select().single();

            if (meal && !mealError) {
                await supabase.from('meal_items').insert([
                    { meal_id: meal.id, food_id: cafe.id, quantity: 1, unit: 'taza', order: 0 },
                    { meal_id: meal.id, food_id: pan.id, quantity: 2, unit: 'rebanadas', order: 1 },
                    { meal_id: meal.id, food_id: queso.id, quantity: 30, unit: 'g', order: 2 }
                ]);
            } else if (mealError) {
                console.error('Error creating Desayuno:', mealError.message);
            }
        }

        // Almuerzo
        if (milanesa && papa && ensalada) {
            const { data: meal, error: mealError } = await supabase.from('meals').insert({
                day_id: day.id,
                name: 'Almuerzo',
                order: 1,
                time: '13:00'
            }).select().single();

            if (meal && !mealError) {
                await supabase.from('meal_items').insert([
                    { meal_id: meal.id, food_id: milanesa.id, quantity: 150, unit: 'g', order: 0 },
                    { meal_id: meal.id, food_id: papa.id, quantity: 200, unit: 'g', order: 1 },
                    { meal_id: meal.id, food_id: ensalada.id, quantity: 100, unit: 'g', order: 2 }
                ]);
            }
        }

        // Merienda
        if (yogur && fruta) {
            const { data: meal, error: mealError } = await supabase.from('meals').insert({
                day_id: day.id,
                name: 'Merienda',
                order: 2,
                time: '17:00'
            }).select().single();

            if (meal && !mealError) {
                await supabase.from('meal_items').insert([
                    { meal_id: meal.id, food_id: yogur.id, quantity: 1, unit: 'unidad', order: 0 },
                    { meal_id: meal.id, food_id: fruta.id, quantity: 1, unit: 'unidad', order: 1 }
                ]);
            }
        }

        // Cena
        if (carne && ensalada) {
            const { data: meal, error: mealError } = await supabase.from('meals').insert({
                day_id: day.id,
                name: 'Cena',
                order: 3,
                time: '21:00'
            }).select().single();

            if (meal && !mealError) {
                await supabase.from('meal_items').insert([
                    { meal_id: meal.id, food_id: carne.id, quantity: 200, unit: 'g', order: 0 },
                    { meal_id: meal.id, food_id: ensalada.id, quantity: 200, unit: 'g', order: 1 }
                ]);
            }
        }

    }

    console.log('--- Plan Creation Logic Finished (Basic Structure) ---');
    console.log('NOTE: Detailed meal-food linking requires verifying `plan_meals` and `meal_foods` tables.');
}

createArgentinePlan();
