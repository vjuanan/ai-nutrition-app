
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- 1. FOOD DATA ---
const highProteinFoods = [
    // PROTEINS
    { name: 'Pechuga de Pollo (Cocida)', brand: 'Genérico', calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: 'g', serving_size: 100 },
    { name: 'Carne Magra (Bife de Lomo)', brand: 'Genérico', calories: 250, protein: 26, carbs: 0, fats: 15, unit: 'g', serving_size: 100 },
    { name: 'Salmón Rosado (Cocido)', brand: 'Genérico', calories: 208, protein: 20, carbs: 0, fats: 13, unit: 'g', serving_size: 100 },
    { name: 'Huevo Entero', brand: 'Genérico', calories: 155, protein: 13, carbs: 1.1, fats: 11, unit: 'u', serving_size: 1 }, // unit u approx 50g
    { name: 'Claras de Huevo', brand: 'Genérico', calories: 52, protein: 11, carbs: 0.7, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Whey Protein', brand: 'Genérico', calories: 380, protein: 75, carbs: 5, fats: 5, unit: 'g', serving_size: 100 }, // powder
    { name: 'Queso Cottage / Ricota Magra', brand: 'Genérico', calories: 98, protein: 11, carbs: 3.4, fats: 4.3, unit: 'g', serving_size: 100 },

    // CARBS
    { name: 'Arroz Blanco (Cocido)', brand: 'Genérico', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Papa (Hervida)', brand: 'Genérico', calories: 87, protein: 2, carbs: 20, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Avena (Cruda)', brand: 'Genérico', calories: 389, protein: 16.9, carbs: 66, fats: 6.9, unit: 'g', serving_size: 100 },
    { name: 'Banana', brand: 'Genérico', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, unit: 'u', serving_size: 1 },
    { name: 'Frutos Rojos (Mix)', brand: 'Congelado', calories: 57, protein: 0.7, carbs: 14, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Pan Integral', brand: 'Genérico', calories: 265, protein: 9, carbs: 49, fats: 3.2, unit: 'g', serving_size: 100 },

    // FATS
    { name: 'Palta / Aguacate', brand: 'Genérico', calories: 160, protein: 2, carbs: 9, fats: 15, unit: 'u', serving_size: 1 },
    { name: 'Aceite de Oliva', brand: 'Genérico', calories: 884, protein: 0, carbs: 0, fats: 100, unit: 'ml', serving_size: 100 },
    { name: 'Almendras', brand: 'Genérico', calories: 579, protein: 21, carbs: 22, fats: 50, unit: 'g', serving_size: 100 },
    { name: 'Mantequilla de Maní', brand: 'Natural', calories: 588, protein: 25, carbs: 20, fats: 50, unit: 'g', serving_size: 100 },

    // VEGGIES
    { name: 'Brócoli (Hervido)', brand: 'Genérico', calories: 35, protein: 2.4, carbs: 7.2, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Espinaca (Cruda)', brand: 'Genérico', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Espárragos', brand: 'Genérico', calories: 20, protein: 2.2, carbs: 3.9, fats: 0.1, unit: 'g', serving_size: 100 },
];

async function createIsraetelPlan() {
    console.log('--- Creating Mike Israetel High Protein Plan ---');

    const adminEmail = 'vjuanan@gmail.com';
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminUser = users.find(u => u.email === adminEmail);

    if (!adminUser) {
        console.error(`❌ Admin user ${adminEmail} not found!`);
        return;
    }

    // 1. SEED FOODS
    console.log('🌱 Seeding Foods...');
    const foodMap = new Map<string, string>(); // Name -> ID

    for (const food of highProteinFoods) {
        // Check exact match first
        let { data: existing } = await supabase
            .from('foods')
            .select('id')
            .eq('name', food.name)
            .maybeSingle();

        if (!existing) {
            console.log(`   Creating: ${food.name}`);
            const { data: newFood, error } = await supabase
                .from('foods')
                .insert(food)
                .select('id')
                .single();

            if (error) {
                console.error(`   ❌ Error creating ${food.name}:`, error.message);
                continue;
            }
            existing = newFood;
        } else {
            // console.log(`   Found: ${food.name}`);
        }

        if (existing) {
            foodMap.set(food.name, existing.id);
        }
    }

    // 2. CREATE PLAN
    console.log('📝 Creating Plan Template...');
    const planName = 'Hipertrofia - Alto en Proteína (Mike Israetel)';

    // Check if plan exists to avoid duplicates (optional, or just create new)
    // We'll create new to ensure fresh structure
    const { data: plan, error: planError } = await supabase
        .from('nutritional_plans')
        .insert({
            user_id: adminUser.id,
            name: planName,
            description: 'Plan basado en principios de hipertrofia: 2g/kg proteína, carbohidratos peri-entreno, grasas saludables alejadas del entrenamiento. Ideal para ganancia muscular.',
            type: 'template',
            is_active: true
        })
        .select()
        .single();

    if (planError) {
        console.error('❌ Error creating plan:', planError.message);
        return;
    }
    console.log(`✅ Plan Created: ${plan.id}`);

    // 3. CREATE DAYS & MEALS
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Helper to get ID
    const getFoodId = (name: string) => foodMap.get(name);

    for (let i = 0; i < days.length; i++) {
        const dayName = days[i];
        console.log(`   📅 Creating Day: ${dayName}`);

        const { data: day, error: dayError } = await supabase
            .from('plan_days')
            .insert({
                plan_id: plan.id,
                day_of_week: i, // 0-6
                name: dayName,
                order: i,
                target_calories: 2500,
                target_protein: 200,
                target_carbs: 250,
                target_fats: 70
            })
            .select()
            .single();

        if (dayError) { console.error(`   ❌ Error creating day:`, dayError.message); continue; }

        // MEAL 1: Desayuno (Protein + Fats + Fiber) - Low Carb start
        // Eggs + Spinach + Avocado
        const m1 = await supabase.from('meals').insert({ day_id: day.id, name: 'Desayuno', order: 0, time: '08:00' }).select().single();
        if (m1.data) {
            await supabase.from('meal_items').insert([
                { meal_id: m1.data.id, food_id: getFoodId('Huevo Entero'), quantity: 3, unit: 'u', order: 0 },
                { meal_id: m1.data.id, food_id: getFoodId('Claras de Huevo'), quantity: 100, unit: 'g', order: 1 },
                { meal_id: m1.data.id, food_id: getFoodId('Avena (Cruda)'), quantity: 40, unit: 'g', order: 2 }, // Small carb amount
                { meal_id: m1.data.id, food_id: getFoodId('Frutos Rojos (Mix)'), quantity: 100, unit: 'g', order: 3 },
            ]);
        }

        // MEAL 2: Almuerzo (Balanced)
        // Chicken + Rice + Broccoli + Olive Oil
        const m2 = await supabase.from('meals').insert({ day_id: day.id, name: 'Almuerzo', order: 1, time: '13:00' }).select().single();
        if (m2.data) {
            await supabase.from('meal_items').insert([
                { meal_id: m2.data.id, food_id: getFoodId('Pechuga de Pollo (Cocida)'), quantity: 150, unit: 'g', order: 0 },
                { meal_id: m2.data.id, food_id: getFoodId('Arroz Blanco (Cocido)'), quantity: 200, unit: 'g', order: 1 }, // High carb
                { meal_id: m2.data.id, food_id: getFoodId('Brócoli (Hervido)'), quantity: 150, unit: 'g', order: 2 },
                { meal_id: m2.data.id, food_id: getFoodId('Aceite de Oliva'), quantity: 10, unit: 'ml', order: 3 },
            ]);
        }

        // MEAL 3: Pre-Entreno / Merienda (Digestion easy)
        // Whey + Banana + Peanut Butter
        const m3 = await supabase.from('meals').insert({ day_id: day.id, name: 'Pre-Entreno', order: 2, time: '17:00' }).select().single();
        if (m3.data) {
            await supabase.from('meal_items').insert([
                { meal_id: m3.data.id, food_id: getFoodId('Whey Protein'), quantity: 30, unit: 'g', order: 0 },
                { meal_id: m3.data.id, food_id: getFoodId('Banana'), quantity: 1, unit: 'u', order: 1 },
                { meal_id: m3.data.id, food_id: getFoodId('Mantequilla de Maní'), quantity: 15, unit: 'g', order: 2 },
            ]);
        }

        // MEAL 4: Cena (Post-Workout Recovery)
        // Lean Meat + Potato + Veggies (Low Fat typically post workout, but balanced here)
        const m4 = await supabase.from('meals').insert({ day_id: day.id, name: 'Cena', order: 3, time: '21:00' }).select().single();
        if (m4.data) {
            await supabase.from('meal_items').insert([
                { meal_id: m4.data.id, food_id: getFoodId('Carne Magra (Bife de Lomo)'), quantity: 150, unit: 'g', order: 0 },
                { meal_id: m4.data.id, food_id: getFoodId('Papa (Hervida)'), quantity: 250, unit: 'g', order: 1 },
                { meal_id: m4.data.id, food_id: getFoodId('Espárragos'), quantity: 150, unit: 'g', order: 2 },
                { meal_id: m4.data.id, food_id: getFoodId('Aceite de Oliva'), quantity: 5, unit: 'ml', order: 3 },
            ]);
        }
    }

    console.log('🎉 Plan Creation Complete!');
}

createIsraetelPlan().catch(console.error);
