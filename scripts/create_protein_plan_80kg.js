#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TARGET_CALORIES = 3100;
const TARGET_PROTEIN = 176;
const TRAINING_SLOT = 'morning';

const FOOD_LIBRARY = {
  'Avena (Cruda)': { calories: 389, protein: 16.9, carbs: 66, fats: 6.9, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Leche Descremada': { calories: 34, protein: 3.4, carbs: 5, fats: 0.1, serving_size: 100, unit: 'ml', category: 'Lácteos' },
  Banana: { calories: 89, protein: 1.1, carbs: 23, fats: 0.3, serving_size: 100, unit: 'g', category: 'Frutas' },
  'Batido de Proteína Whey': { calories: 103, protein: 20, carbs: 3, fats: 1.5, serving_size: 30, unit: 'g', category: 'Proteína' },
  'Arroz Blanco (Cocido)': { calories: 130, protein: 2.7, carbs: 28, fats: 0.3, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Pechuga de Pollo (Cocida)': { calories: 165, protein: 31, carbs: 0, fats: 3.6, serving_size: 100, unit: 'g', category: 'Proteína' },
  'Aceite de Oliva': { calories: 884, protein: 0, carbs: 0, fats: 100, serving_size: 100, unit: 'ml', category: 'Grasas' },
  'Fideos / Pastas (Cocidos)': { calories: 130, protein: 5, carbs: 25, fats: 1, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Carne Magra (Bife de Lomo)': { calories: 250, protein: 26, carbs: 0, fats: 15, serving_size: 100, unit: 'g', category: 'Proteína' },
  'Brócoli': { calories: 34, protein: 2.8, carbs: 7, fats: 0.4, serving_size: 100, unit: 'g', category: 'Verduras' },
  'Yogur Griego': { calories: 59, protein: 10, carbs: 3.6, fats: 0.4, serving_size: 100, unit: 'g', category: 'Lácteos' },
  'Pan Integral': { calories: 265, protein: 9, carbs: 49, fats: 3.2, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Mantequilla de Maní': { calories: 588, protein: 25, carbs: 20, fats: 50, serving_size: 100, unit: 'g', category: 'Grasas' },
  'Quinoa Cocida': { calories: 120, protein: 4.4, carbs: 21, fats: 1.9, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Salmón': { calories: 208, protein: 20, carbs: 0, fats: 13, serving_size: 100, unit: 'g', category: 'Proteína' },
  Palta: { calories: 160, protein: 2, carbs: 9, fats: 15, serving_size: 100, unit: 'g', category: 'Grasas' },
  Manzana: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, serving_size: 100, unit: 'g', category: 'Frutas' },
  Maní: { calories: 567, protein: 26, carbs: 16, fats: 49, serving_size: 100, unit: 'g', category: 'Grasas' },
  'Atún en Lata (en agua)': { calories: 116, protein: 26, carbs: 0, fats: 0.8, serving_size: 100, unit: 'g', category: 'Proteína' },
  'Papa Cocida': { calories: 87, protein: 1.9, carbs: 20, fats: 0.1, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  'Pechuga de Pavo': { calories: 135, protein: 30, carbs: 0, fats: 1.5, serving_size: 100, unit: 'g', category: 'Proteína' },
  'Queso Cottage': { calories: 98, protein: 11, carbs: 3.4, fats: 4.3, serving_size: 100, unit: 'g', category: 'Lácteos' },
  'Carne Molida 90/10': { calories: 176, protein: 20, carbs: 0, fats: 10, serving_size: 100, unit: 'g', category: 'Proteína' },
  Frutillas: { calories: 32, protein: 0.7, carbs: 8, fats: 0.3, serving_size: 100, unit: 'g', category: 'Frutas' },
  'Lentejas Cocidas': { calories: 116, protein: 9, carbs: 20, fats: 0.4, serving_size: 100, unit: 'g', category: 'Carbohidratos' },
  Merluza: { calories: 80, protein: 17, carbs: 0, fats: 1, serving_size: 100, unit: 'g', category: 'Proteína' },
};

const TEMPLATE_A = [
  {
    name: 'Desayuno',
    time: '07:00',
    foods: [
      ['Avena (Cruda)', 80],
      ['Leche Descremada', 250],
      ['Banana', 120],
      ['Batido de Proteína Whey', 20],
    ],
  },
  {
    name: 'Post-Entreno',
    time: '10:00',
    foods: [
      ['Arroz Blanco (Cocido)', 280],
      ['Pechuga de Pollo (Cocida)', 130],
      ['Aceite de Oliva', 12],
    ],
  },
  {
    name: 'Almuerzo',
    time: '13:30',
    foods: [
      ['Fideos / Pastas (Cocidos)', 260],
      ['Carne Magra (Bife de Lomo)', 80],
      ['Aceite de Oliva', 10],
      ['Brócoli', 200],
    ],
  },
  {
    name: 'Merienda',
    time: '17:30',
    foods: [
      ['Yogur Griego', 150],
      ['Pan Integral', 120],
      ['Mantequilla de Maní', 20],
      ['Manzana', 200],
    ],
  },
  {
    name: 'Cena',
    time: '21:00',
    foods: [
      ['Quinoa Cocida', 250],
      ['Salmón', 40],
      ['Palta', 120],
    ],
  },
];

const TEMPLATE_B = [
  {
    name: 'Desayuno',
    time: '07:00',
    foods: [
      ['Yogur Griego', 350],
      ['Avena (Cruda)', 80],
      ['Banana', 150],
      ['Maní', 10],
      ['Batido de Proteína Whey', 10],
    ],
  },
  {
    name: 'Post-Entreno',
    time: '10:00',
    foods: [
      ['Arroz Blanco (Cocido)', 290],
      ['Atún en Lata (en agua)', 80],
      ['Aceite de Oliva', 10],
    ],
  },
  {
    name: 'Almuerzo',
    time: '13:30',
    foods: [
      ['Papa Cocida', 400],
      ['Pechuga de Pavo', 80],
      ['Aceite de Oliva', 10],
      ['Brócoli', 150],
    ],
  },
  {
    name: 'Merienda',
    time: '17:30',
    foods: [
      ['Pan Integral', 110],
      ['Queso Cottage', 100],
      ['Manzana', 200],
    ],
  },
  {
    name: 'Cena',
    time: '21:00',
    foods: [
      ['Fideos / Pastas (Cocidos)', 300],
      ['Carne Molida 90/10', 80],
      ['Palta', 120],
    ],
  },
];

const TEMPLATE_C = [
  {
    name: 'Desayuno',
    time: '07:00',
    foods: [
      ['Avena (Cruda)', 70],
      ['Leche Descremada', 250],
      ['Frutillas', 150],
      ['Batido de Proteína Whey', 20],
    ],
  },
  {
    name: 'Post-Entreno',
    time: '10:00',
    foods: [
      ['Papa Cocida', 350],
      ['Pechuga de Pavo', 80],
      ['Aceite de Oliva', 10],
    ],
  },
  {
    name: 'Almuerzo',
    time: '13:30',
    foods: [
      ['Arroz Blanco (Cocido)', 370],
      ['Lentejas Cocidas', 150],
      ['Carne Molida 90/10', 70],
      ['Aceite de Oliva', 10],
    ],
  },
  {
    name: 'Merienda',
    time: '17:30',
    foods: [
      ['Yogur Griego', 250],
      ['Pan Integral', 150],
      ['Mantequilla de Maní', 15],
      ['Manzana', 150],
    ],
  },
  {
    name: 'Cena',
    time: '21:00',
    foods: [
      ['Quinoa Cocida', 250],
      ['Merluza', 120],
      ['Palta', 100],
    ],
  },
];

const WEEK_DISTRIBUTION = ['A', 'B', 'C', 'A', 'B', 'C', 'A'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

async function resolveTargetProfile(emailArg) {
  if (emailArg) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('email', emailArg)
      .single();

    if (error || !data) throw new Error(`Profile not found for email: ${emailArg}`);
    return data;
  }

  const { data: preferred, error: preferredError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .in('role', ['nutritionist', 'coach', 'admin'])
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!preferredError && preferred && preferred.length > 0) return preferred[0];

  const { data: fallback, error: fallbackError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (fallbackError || !fallback || fallback.length === 0) {
    throw new Error('No profile available to assign the plan.');
  }

  return fallback[0];
}

async function ensureFoods(templates) {
  const { error: categoryCheckError } = await supabase.from('foods').select('category').limit(1);
  const hasFoodCategoryColumn = !categoryCheckError;

  const neededNames = [...new Set(
    templates.flatMap((template) => template.flatMap((meal) => meal.foods.map(([name]) => name)))
  )];

  const { data: existing, error: existingError } = await supabase
    .from('foods')
    .select('id, name')
    .in('name', neededNames);

  if (existingError) throw existingError;

  const existingNames = new Set((existing || []).map((food) => food.name));

  const missing = neededNames.filter((name) => !existingNames.has(name));
  for (const name of missing) {
    const metadata = FOOD_LIBRARY[name];
    if (!metadata) {
      throw new Error(`Missing nutrition metadata for food "${name}"`);
    }

    const insertPayload = {
      name,
      brand: null,
      calories: metadata.calories,
      protein: metadata.protein,
      carbs: metadata.carbs,
      fats: metadata.fats,
      serving_size: metadata.serving_size,
      unit: metadata.unit,
    };

    if (hasFoodCategoryColumn) {
      insertPayload.category = metadata.category || 'Otros';
    }

    const { error } = await supabase
      .from('foods')
      .insert(insertPayload);

    if (error) throw error;
    console.log(`Created missing food: ${name}`);
  }

  const { data: finalFoods, error: finalFoodsError } = await supabase
    .from('foods')
    .select('id, name')
    .in('name', neededNames);

  if (finalFoodsError) throw finalFoodsError;

  return new Map((finalFoods || []).map((food) => [food.name, food.id]));
}

async function run() {
  const emailArg = process.argv[2] || null;
  const targetProfile = await resolveTargetProfile(emailArg);
  const templatesByKey = { A: TEMPLATE_A, B: TEMPLATE_B, C: TEMPLATE_C };
  const { error: trainingSlotCheckError } = await supabase.from('plan_days').select('training_slot').limit(1);
  const hasTrainingSlotColumn = !trainingSlotCheckError;

  const foodIdByName = await ensureFoods([TEMPLATE_A, TEMPLATE_B, TEMPLATE_C]);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planName = `Plan Proteico 80kg Volumen Limpio ${stamp}`;

  const { data: plan, error: planError } = await supabase
    .from('nutritional_plans')
    .insert({
      user_id: targetProfile.id,
      name: planName,
      description: 'Plan semanal modelo: volumen limpio, alto en proteína (2.2 g/kg).',
      type: 'high_protein',
      is_active: true,
    })
    .select()
    .single();

  if (planError) throw planError;

  for (let i = 0; i < 7; i += 1) {
    const templateKey = WEEK_DISTRIBUTION[i];
    const template = templatesByKey[templateKey];

    const dayPayload = {
      plan_id: plan.id,
      day_of_week: i,
      name: DAY_NAMES[i],
      order: i,
      target_calories: TARGET_CALORIES,
      target_protein: TARGET_PROTEIN,
    };
    if (hasTrainingSlotColumn) {
      dayPayload.training_slot = TRAINING_SLOT;
    }

    const { data: day, error: dayError } = await supabase
      .from('plan_days')
      .insert(dayPayload)
      .select()
      .single();

    if (dayError) throw dayError;

    for (let mealIndex = 0; mealIndex < template.length; mealIndex += 1) {
      const mealConfig = template[mealIndex];
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          day_id: day.id,
          name: mealConfig.name,
          time: mealConfig.time,
          order: mealIndex,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      const mealItems = mealConfig.foods.map(([foodName, qty], itemIndex) => ({
        meal_id: meal.id,
        food_id: foodIdByName.get(foodName),
        quantity: qty,
        order: itemIndex,
      }));

      const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);
      if (itemsError) throw itemsError;
    }
  }

  console.log('\nPlan created successfully');
  console.log(`User: ${targetProfile.full_name || targetProfile.email || targetProfile.id}`);
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Plan Name: ${plan.name}`);
  console.log(`Editor URL: /editor/${plan.id}\n`);
}

run().catch((error) => {
  console.error('Failed to create protein plan:', error.message || error);
  process.exit(1);
});
