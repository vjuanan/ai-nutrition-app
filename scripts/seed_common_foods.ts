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

interface FoodData {
    name: string;
    brand?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    unit: string;
    serving_size: number;
}

const commonFoods: FoodData[] = [
    // ============ PROTEÍNAS ============
    // Carnes y Aves
    { name: 'Pechuga de Pollo', calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: 'g', serving_size: 100 },
    { name: 'Muslo de Pollo', calories: 209, protein: 26, carbs: 0, fats: 11, unit: 'g', serving_size: 100 },
    { name: 'Carne Molida 90/10', calories: 176, protein: 20, carbs: 0, fats: 10, unit: 'g', serving_size: 100 },
    { name: 'Bife de Lomo', calories: 271, protein: 25, carbs: 0, fats: 19, unit: 'g', serving_size: 100 },
    { name: 'Asado de Tira', calories: 250, protein: 26, carbs: 0, fats: 16, unit: 'g', serving_size: 100 },
    { name: 'Vacío', calories: 291, protein: 22, carbs: 0, fats: 22, unit: 'g', serving_size: 100 },
    { name: 'Pechuga de Pavo', calories: 135, protein: 30, carbs: 0, fats: 1.5, unit: 'g', serving_size: 100 },

    // Pescados y Mariscos
    { name: 'Merluza', calories: 90, protein: 18, carbs: 0, fats: 1.3, unit: 'g', serving_size: 100 },
    { name: 'Salmón', calories: 208, protein: 20, carbs: 0, fats: 13, unit: 'g', serving_size: 100 },
    { name: 'Atún en Lata (en agua)', calories: 116, protein: 26, carbs: 0, fats: 0.8, unit: 'g', serving_size: 100 },
    { name: 'Camarones', calories: 99, protein: 24, carbs: 0.2, fats: 0.3, unit: 'g', serving_size: 100 },

    // Huevos
    { name: 'Huevo Entero', calories: 155, protein: 13, carbs: 1.1, fats: 11, unit: 'unit', serving_size: 1 },
    { name: 'Clara de Huevo', calories: 52, protein: 11, carbs: 0.7, fats: 0.2, unit: 'unit', serving_size: 3 },

    // Legumbres
    { name: 'Lentejas Cocidas', calories: 116, protein: 9, carbs: 20, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Garbanzos Cocidos', calories: 164, protein: 9, carbs: 27, fats: 2.6, unit: 'g', serving_size: 100 },
    { name: 'Porotos Negros Cocidos', calories: 132, protein: 8.9, carbs: 24, fats: 0.5, unit: 'g', serving_size: 100 },

    // ============ CARBOHIDRATOS ============
    // Cereales y Granos
    { name: 'Fideos Cocidos', calories: 131, protein: 5, carbs: 25, fats: 1.1, unit: 'g', serving_size: 100 },
    { name: 'Avena Cruda', calories: 389, protein: 17, carbs: 66, fats: 7, unit: 'g', serving_size: 100 },
    { name: 'Pan Integral', calories: 247, protein: 13, carbs: 41, fats: 3.5, unit: 'g', serving_size: 100 },
    { name: 'Pan Blanco', calories: 265, protein: 9, carbs: 49, fats: 3.2, unit: 'g', serving_size: 100 },
    { name: 'Quinoa Cocida', calories: 120, protein: 4.4, carbs: 21, fats: 1.9, unit: 'g', serving_size: 100 },

    // Tubérculos
    { name: 'Papa Cocida', calories: 87, protein: 1.9, carbs: 20, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Batata Cocida', calories: 90, protein: 2, carbs: 21, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Yuca Cocida', calories: 160, protein: 1.4, carbs: 38, fats: 0.3, unit: 'g', serving_size: 100 },

    // ============ VEGETALES ============
    { name: 'Brócoli', calories: 34, protein: 2.8, carbs: 7, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Espinaca', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Tomate', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Lechuga', calories: 15, protein: 1.4, carbs: 2.9, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Cebolla', calories: 40, protein: 1.1, carbs: 9.3, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Zanahoria', calories: 41, protein: 0.9, carbs: 10, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Pimiento Rojo', calories: 31, protein: 1, carbs: 6, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Calabacín', calories: 17, protein: 1.2, carbs: 3.1, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Berenjena', calories: 25, protein: 1, carbs: 6, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Espárragos', calories: 20, protein: 2.2, carbs: 3.9, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Coliflor', calories: 25, protein: 1.9, carbs: 5, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Acelga', calories: 19, protein: 1.8, carbs: 3.7, fats: 0.2, unit: 'g', serving_size: 100 },

    // ============ FRUTAS ============
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Manzana', calories: 52, protein: 0.3, carbs: 14, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Naranja', calories: 47, protein: 0.9, carbs: 12, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Pera', calories: 57, protein: 0.4, carbs: 15, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Frutillas', calories: 32, protein: 0.7, carbs: 8, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Arándanos', calories: 57, protein: 0.7, carbs: 14, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Uvas', calories: 69, protein: 0.7, carbs: 18, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Durazno', calories: 39, protein: 0.9, carbs: 10, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Melón', calories: 34, protein: 0.8, carbs: 8, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Sandía', calories: 30, protein: 0.6, carbs: 8, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Kiwi', calories: 61, protein: 1.1, carbs: 15, fats: 0.5, unit: 'g', serving_size: 100 },
    { name: 'Mandarina', calories: 53, protein: 0.8, carbs: 13, fats: 0.3, unit: 'g', serving_size: 100 },

    // ============ LÁCTEOS ============
    { name: 'Leche Entera', calories: 61, protein: 3.2, carbs: 4.8, fats: 3.3, unit: 'ml', serving_size: 100 },
    { name: 'Leche Descremada', calories: 34, protein: 3.4, carbs: 5, fats: 0.1, unit: 'ml', serving_size: 100 },
    { name: 'Yogur Natural Entero', calories: 61, protein: 3.5, carbs: 4.7, fats: 3.3, unit: 'g', serving_size: 100 },
    { name: 'Yogur Griego', calories: 59, protein: 10, carbs: 3.6, fats: 0.4, unit: 'g', serving_size: 100 },
    { name: 'Queso Cremoso', calories: 313, protein: 6, carbs: 4.1, fats: 31, unit: 'g', serving_size: 100 },
    { name: 'Queso Mozzarella', calories: 280, protein: 28, carbs: 2.2, fats: 17, unit: 'g', serving_size: 100 },
    { name: 'Queso Cheddar', calories: 403, protein: 25, carbs: 1.3, fats: 33, unit: 'g', serving_size: 100 },
    { name: 'Ricota', calories: 174, protein: 11, carbs: 3, fats: 13, unit: 'g', serving_size: 100 },
    { name: 'Queso Cottage', calories: 98, protein: 11, carbs: 3.4, fats: 4.3, unit: 'g', serving_size: 100 },

    // ============ GRASAS SALUDABLES ============
    { name: 'Palta', calories: 160, protein: 2, carbs: 9, fats: 15, unit: 'g', serving_size: 100 },
    { name: 'Aceite de Oliva', calories: 884, protein: 0, carbs: 0, fats: 100, unit: 'ml', serving_size: 100 },
    { name: 'Almendras', calories: 579, protein: 21, carbs: 22, fats: 50, unit: 'g', serving_size: 100 },
    { name: 'Nueces', calories: 654, protein: 15, carbs: 14, fats: 65, unit: 'g', serving_size: 100 },
    { name: 'Maní', calories: 567, protein: 26, carbs: 16, fats: 49, unit: 'g', serving_size: 100 },
    { name: 'Semillas de Chía', calories: 486, protein: 17, carbs: 42, fats: 31, unit: 'g', serving_size: 100 },
    { name: 'Mantequilla de Maní', calories: 588, protein: 25, carbs: 20, fats: 50, unit: 'g', serving_size: 100 },

    // ============ SNACKS Y OTROS ============
    { name: 'Hummus', calories: 166, protein: 8, carbs: 14, fats: 10, unit: 'g', serving_size: 100 },
    { name: 'Granola', calories: 471, protein: 13, carbs: 64, fats: 18, unit: 'g', serving_size: 100 },
    { name: 'Barra de Proteína', calories: 379, protein: 30, carbs: 39, fats: 11, unit: 'g', serving_size: 100 },
    { name: 'Batido de Proteína Whey', calories: 103, protein: 20, carbs: 3, fats: 1.5, unit: 'g', serving_size: 30 },
];

async function seedFoods() {
    console.log('🌱 Starting food database seed...\n');

    try {
        // Check if foods already exist
        const { data: existingFoods, error: checkError } = await supabase
            .from('foods')
            .select('name')
            .limit(1);

        if (checkError) {
            console.error('❌ Error checking foods table:', checkError);
            throw checkError;
        }

        if (existingFoods && existingFoods.length > 0) {
            console.log('⚠️  Foods table already has data. Skipping common foods that already exist...\n');
        }

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        for (const food of commonFoods) {
            // Check if food already exists
            const { data: existing } = await supabase
                .from('foods')
                .select('id')
                .eq('name', food.name)
                .single();

            if (existing) {
                console.log(`⏭️  Skipped: ${food.name} (already exists)`);
                skipped++;
                continue;
            }

            // Insert the food
            const { error } = await supabase
                .from('foods')
                .insert([food]);

            if (error) {
                console.error(`❌ Error inserting ${food.name}:`, error.message);
                errors++;
            } else {
                console.log(`✅ Inserted: ${food.name} (${food.category})`);
                inserted++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✨ Food seeding complete!');
        console.log(`📊 Statistics:`);
        console.log(`   - Inserted: ${inserted} foods`);
        console.log(`   - Skipped: ${skipped} foods (already existed)`);
        console.log(`   - Errors: ${errors} foods`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('💥 Fatal error during seeding:', error);
        throw error;
    }
}

// Run the seed
seedFoods()
    .then(() => {
        console.log('\n🎉 Seed script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💀 Seed script failed:', error);
        process.exit(1);
    });
