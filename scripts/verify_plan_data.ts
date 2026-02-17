import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
    console.log('🔍 Verifying plan data...\n');

    // 1. Find the template plan
    const { data: plans } = await supabase
        .from('nutritional_plans')
        .select('id, name, user_id, is_active')
        .ilike('name', '%Mike Israetel%');

    console.log('📋 Plans found:');
    plans?.forEach(p => console.log(`  - ${p.name} (ID: ${p.id}, user: ${p.user_id}, active: ${p.is_active})`));

    if (!plans || plans.length === 0) return;

    // Check each plan
    for (const plan of plans) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Plan: ${plan.name} (${plan.id})`);
        console.log(`${'='.repeat(60)}`);

        // 2. Get days
        const { data: days } = await supabase
            .from('plan_days')
            .select('id, name, order')
            .eq('plan_id', plan.id)
            .order('order');

        console.log(`\n📅 Days: ${days?.length || 0}`);

        if (!days || days.length === 0) {
            console.log('  ❌ No days!');
            continue;
        }

        // 3. Get meals for each day
        for (const day of days) {
            const { data: meals } = await supabase
                .from('meals')
                .select('id, name, order, time')
                .eq('day_id', day.id)
                .order('order');

            console.log(`\n  📆 ${day.name} - ${meals?.length || 0} meals`);

            if (!meals) continue;

            for (const meal of meals) {
                const { data: items } = await supabase
                    .from('meal_items')
                    .select('id, food_id, quantity, foods(name, calories, protein)')
                    .eq('meal_id', meal.id);

                console.log(`    🍽️  ${meal.name} (${meal.time || 'no time'}) - ${items?.length || 0} items`);

                if (items && items.length > 0) {
                    items.forEach((item: any) => {
                        const food = item.foods;
                        console.log(`      - ${item.quantity} ${food?.name || 'unknown'} (${food?.calories || 0} kcal)`);
                    });
                }
            }
        }
    }

    // 4. Check the logged-in user
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .ilike('email', '%vjuanan%');

    console.log('\n\n👤 User profile:');
    profiles?.forEach(p => console.log(`  - ${p.name} (${p.email}) ID: ${p.id}, role: ${p.role}`));
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
