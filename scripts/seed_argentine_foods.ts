
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const foods = [
    // MEATS
    { name: 'Asado (Tira de costilla)', brand: 'Genérico', calories: 280, protein: 18, carbs: 0, fats: 23, unit: 'g', serving_size: 100 },
    { name: 'Vacío (Carne vacuna)', brand: 'Genérico', calories: 180, protein: 20, carbs: 0, fats: 11, unit: 'g', serving_size: 100 },
    { name: 'Milanesa de Carne (Frita)', brand: 'Casera', calories: 310, protein: 16, carbs: 20, fats: 18, unit: 'g', serving_size: 100 },
    { name: 'Milanesa de Carne (Horno)', brand: 'Casera', calories: 230, protein: 18, carbs: 18, fats: 9, unit: 'g', serving_size: 100 },
    { name: 'Bife de Chorizo', brand: 'Genérico', calories: 210, protein: 22, carbs: 0, fats: 13, unit: 'g', serving_size: 100 },
    { name: 'Pechuga de Pollo (Plancha)', brand: 'Genérico', calories: 120, protein: 23, carbs: 0, fats: 2.5, unit: 'g', serving_size: 100 },
    { name: 'Muslo de Pollo (sin piel)', brand: 'Genérico', calories: 150, protein: 19, carbs: 0, fats: 8, unit: 'g', serving_size: 100 },
    { name: 'Merluza', brand: 'Genérico', calories: 80, protein: 17, carbs: 0, fats: 1, unit: 'g', serving_size: 100 },
    { name: 'Huevo (Duro)', brand: 'Genérico', calories: 155, protein: 13, carbs: 1, fats: 11, unit: 'g', serving_size: 100 },

    // DAIRY
    { name: 'Dulce de Leche', brand: 'La Serenísima (Ref)', calories: 320, protein: 6, carbs: 55, fats: 8, unit: 'g', serving_size: 100 },
    { name: 'Queso Cremoso / Por Salut', brand: 'Genérico', calories: 280, protein: 18, carbs: 2, fats: 22, unit: 'g', serving_size: 100 },
    { name: 'Queso Muzzarella', brand: 'Genérico', calories: 300, protein: 22, carbs: 3, fats: 22, unit: 'g', serving_size: 100 },
    { name: 'Yogur Entero Vainilla', brand: 'Yogurísimo (Ref)', calories: 95, protein: 3.5, carbs: 14, fats: 3, unit: 'g', serving_size: 100 },
    { name: 'Leche Entera', brand: 'Genérico', calories: 60, protein: 3, carbs: 4.7, fats: 3, unit: 'ml', serving_size: 100 },

    // GRAINS & FLOURS
    { name: 'Pan Francés', brand: 'Panadería', calories: 270, protein: 9, carbs: 55, fats: 1.5, unit: 'g', serving_size: 100 },
    { name: 'Tapas de Empanada (Hojaldre)', brand: 'La Salteña (Ref)', calories: 350, protein: 6, carbs: 45, fats: 16, unit: 'u', serving_size: 1 }, // unit: unidad approx 30g
    { name: 'Fideos / Pastas (Cocidos)', brand: 'Genérico', calories: 130, protein: 5, carbs: 25, fats: 1, unit: 'g', serving_size: 100 },
    { name: 'Arroz Blanco (Cocido)', brand: 'Genérico', calories: 130, protein: 2.7, carbs: 28, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Polenta (Cocida)', brand: 'Genérico', calories: 85, protein: 2, carbs: 18, fats: 0.5, unit: 'g', serving_size: 100 },
    { name: 'Facturas (Media Luna Manteca)', brand: 'Panadería', calories: 400, protein: 7, carbs: 45, fats: 22, unit: 'u', serving_size: 1 }, // unit: unidad approx 40g
    { name: 'Bizcochitos de Grasa', brand: '9 de Oro (Ref)', calories: 480, protein: 8, carbs: 60, fats: 24, unit: 'g', serving_size: 100 },

    // VEGETABLES & TUBERS
    { name: 'Papa (Hervida)', brand: 'Genérico', calories: 87, protein: 2, carbs: 20, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Batata (Hervida)', brand: 'Genérico', calories: 86, protein: 1.6, carbs: 20, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Zapallo Anco (Hervido)', brand: 'Genérico', calories: 35, protein: 1, carbs: 8, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Tomate', brand: 'Genérico', calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Lechuga', brand: 'Genérico', calories: 15, protein: 1.4, carbs: 2.9, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Acelga (Cocida)', brand: 'Genérico', calories: 20, protein: 2, carbs: 4, fats: 0.2, unit: 'g', serving_size: 100 },

    // FRUITS
    { name: 'Manzana', brand: 'Genérico', calories: 52, protein: 0.3, carbs: 14, fats: 0.2, unit: 'g', serving_size: 100 },
    { name: 'Banana', brand: 'Genérico', calories: 89, protein: 1.1, carbs: 23, fats: 0.3, unit: 'g', serving_size: 100 },
    { name: 'Naranja', brand: 'Genérico', calories: 47, protein: 0.9, carbs: 12, fats: 0.1, unit: 'g', serving_size: 100 },
    { name: 'Mandarina', brand: 'Genérico', calories: 53, protein: 0.8, carbs: 13, fats: 0.3, unit: 'g', serving_size: 100 },

    // OTHERS
    { name: 'Yerba Mate', brand: 'Genérico', calories: 5, protein: 0.5, carbs: 1, fats: 0, unit: 'g', serving_size: 100 }, // Infusion itself is low cal
    { name: 'Aceite de Girasol', brand: 'Genérico', calories: 884, protein: 0, carbs: 0, fats: 100, unit: 'g', serving_size: 100 },
    { name: 'Manteca', brand: 'Genérico', calories: 717, protein: 0.9, carbs: 0.1, fats: 81, unit: 'g', serving_size: 100 },
];

async function seedFoods() {
    console.log('--- Seeding Argentine Foods ---');
    let insertedCount = 0;
    let skippedCount = 0;

    for (const food of foods) {
        // Check if exists
        const { data: existing } = await supabase
            .from('foods')
            .select('id')
            .eq('name', food.name)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log(`Skipping existing: ${food.name}`);
            skippedCount++;
        } else {
            const { error } = await supabase.from('foods').insert(food);
            if (error) {
                console.error(`Error inserting ${food.name}:`, error.message);
            } else {
                console.log(`Inserted: ${food.name}`);
                insertedCount++;
            }
        }
    }

    console.log(`--- Finished ---`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped: ${skippedCount}`);
}

seedFoods();
