'use server';

import { createServerClient } from './supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from './supabase/types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore, unstable_cache } from 'next/cache';

// Types
type NutritionalPlan = Database['public']['Tables']['nutritional_plans']['Row'];
type Meal = Database['public']['Tables']['meals']['Row'];
type PlanDay = Database['public']['Tables']['plan_days']['Row'];
type MealItem = Database['public']['Tables']['meal_items']['Row'];
type Food = Database['public']['Tables']['foods']['Row'];

// ==========================================
// USER ROLE - For Sidebar SSR
// ==========================================

import { cookies } from 'next/headers';

export async function getUserRole(): Promise<'admin' | 'coach' | 'athlete'> {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'coach'; // Default for unauthenticated

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return (profile?.role as 'admin' | 'coach' | 'athlete') || 'coach';
}

// ==========================================
// DASHBOARD STATS
// ==========================================

export async function getDashboardStats() {
    let supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for accurate counts
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    // Get user profile and role
    let role: 'admin' | 'coach' | 'athlete' = 'coach';
    let userName = 'Coach';
    let coachId: string | null = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

        role = (profile?.role as 'admin' | 'coach' | 'athlete') || 'coach';
        userName = profile?.full_name || user?.user_metadata?.full_name || 'Coach';

        // Get coach_id for filtering if role is coach
        if (role === 'coach') {
            const { data: coach } = await supabase
                .from('coaches')
                .select('id')
                .eq('user_id', user.id)
                .single();
            coachId = coach?.id || null;
        }
    }

    if (role === 'athlete') {
        return {
            showStats: false,
            userName,
            athletes: 0,
            activePlans: 0,
            totalMeals: 0
        };
    }

    const isAdmin = role === 'admin';

    // Run parallel queries
    const [
        { count: athletes },
        { count: plans },
        { count: foods }
    ] = await Promise.all([
        // Athletes count
        isAdmin
            ? adminSupabase.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'athlete')
            : adminSupabase.from('clients').select('*', { count: 'exact', head: true }).eq('type', 'athlete').eq('coach_id', coachId!),
        // Plans count
        isAdmin
            ? adminSupabase.from('nutritional_plans').select('*', { count: 'exact', head: true }).eq('is_active', true)
            : adminSupabase.from('nutritional_plans').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('user_id', user?.id), // Assuming user_id is the owner
        // Foods count (Global)
        adminSupabase.from('foods').select('*', { count: 'exact', head: true })
    ]);

    return {
        showStats: true,
        userName,
        athletes: athletes || 0,
        activePlans: plans || 0,
        totalMeals: 0, // Placeholder
        totalFoods: foods || 0
    };
}

// ==========================================
// NUTRITIONAL PLANS ACTIONS
// ==========================================

export async function getNutritionalPlans() {
    noStore();
    let supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Use Service Role if available to bypass RLS issues during dev
    // But ideally should rely on RLS

    const { data, error } = await supabase
        .from('nutritional_plans')
        .select(`*, client:clients(*), coach:profiles!user_id(full_name)`)
        // Note: Relation might be tricky depending on how we set up foreign keys.
        // For now, let's just get the plans.
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching plans:', error);
        return [];
    }
    return data;
}

export async function getNutritionalPlan(id: string) {
    const supabase = createServerClient();

    // Fetch Plan with nested days and meals and items
    // Nested query: plan -> days -> meals -> meal_items -> food

    const { data, error } = await supabase
        .from('nutritional_plans')
        .select(`
            *,
            days:plan_days(
                *,
                meals:meals(
                    *,
                    items:meal_items(
                        *,
                        food:foods(*)
                    )
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching plan details:', error);
        return null;
    }

    // Sort logic (Supabase doesn't always sort nested arrays deeply)
    if (data && data.days) {
        data.days.sort((a: any, b: any) => a.order - b.order);
        data.days.forEach((day: any) => {
            if (day.meals) {
                day.meals.sort((a: any, b: any) => a.order - b.order);
            }
        });
    }

    return data;
}

export async function createNutritionalPlan(
    name: string,
    clientId: string | null,
    options?: {
        description?: string;
        type?: string;
    }
) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    try {
        // 1. Create Plan Header
        const { data: plan, error: planError } = await supabase
            .from('nutritional_plans')
            .insert({
                user_id: user.id, // Owner
                name,
                description: options?.description || null,
                type: options?.type || null,
                is_active: true,
                client_id: clientId || null
            })
            .select()
            .single();

        if (planError) throw planError;

        // 2. Create Default Days (Monday - Sunday)
        const daysToInsert = Array.from({ length: 7 }).map((_, i) => ({
            plan_id: plan.id,
            day_of_week: i, // 0=Sun, 1=Mon... or 0=Mon? Let's say 1=Mon, 7=Sun or 0=Mon.
            // Let's use 0=Monday for simplicity in array index, or standard JS 0=Sunday.
            // Let's stick to 0=Monday, 6=Sunday for UI mapping.
            name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
            order: i
        }));

        const { error: daysError } = await supabase
            .from('plan_days')
            .insert(daysToInsert);

        if (daysError) throw daysError;

        revalidatePath('/meal-plans');
        return { data: plan };

    } catch (error: any) {
        console.error('createNutritionalPlan Error:', error);
        return { error: error.message };
    }
}

export async function deleteNutritionalPlan(id: string) {
    const supabase = createServerClient();

    const { error } = await supabase
        .from('nutritional_plans')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/meal-plans');
    return { success: true };
}

export async function deleteNutritionalPlans(ids: string[]) {
    const supabase = createServerClient();

    const { error } = await supabase
        .from('nutritional_plans')
        .delete()
        .in('id', ids);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/meal-plans');
    return { success: true };
}

export async function updateNutritionalPlan(id: string, updates: any) {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('nutritional_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/meal-plans');
    return { success: true, data };
}

export async function savePlanChanges(planId: string, days: any[]) {
    // This function handles the complex "Save" of the editor.
    // It receives the state of "DraftDay[]" and needs to persist it.
    // Strategy: 
    // - Update Plan Day properties
    // - Sync Meals (Upsert/Delete)
    // - Sync Items (Upsert/Delete)

    const supabase = createServerClient();

    // Use Admin Client for atomic complex operations if possible, or just normal client
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    try {
        console.log(`Saving plan ${planId}...`);

        for (const day of days) {
            // 1. Update Day Info
            // We assume day ID exists (it was created at plan creation)
            await adminSupabase.from('plan_days').update({
                target_calories: day.target_calories,
                target_protein: day.target_protein,
                target_carbs: day.target_carbs,
                target_fats: day.target_fats
            }).eq('id', day.id);

            // 2. Sync Meals
            // Simplest strategy: Delete all meals for day and recreate? 
            // Or careful upsert?
            // "Meals" have IDs. If valid UUID, it exists. If temp ID, it's new.
            // But deleting all is safer for order consistency and clean up of deleted meals.
            // Destructive approach: Delete all meals in this day, insert current state.

            // DELETE existing meals for day
            await adminSupabase.from('meals').delete().eq('day_id', day.id);

            // INSERT new meals
            if (day.meals && day.meals.length > 0) {
                for (const meal of day.meals) {
                    const { data: insertedMeal, error: mealError } = await adminSupabase
                        .from('meals')
                        .insert({
                            day_id: day.id,
                            name: meal.name,
                            time: meal.time,
                            order: meal.order
                        })
                        .select()
                        .single();

                    if (mealError) throw mealError;

                    // 3. Insert Items
                    if (meal.items && meal.items.length > 0) {
                        const itemsToInsert = meal.items.map((item: any, idx: number) => ({
                            meal_id: insertedMeal.id,
                            food_id: item.food_id,
                            quantity: item.quantity,
                            unit: item.unit,
                            order: idx
                        }));

                        const { error: itemsError } = await adminSupabase
                            .from('meal_items')
                            .insert(itemsToInsert);

                        if (itemsError) throw itemsError;
                    }
                }
            }
        }

        revalidatePath(`/editor/${planId}`);
        return { success: true };

    } catch (error: any) {
        console.error('savePlanChanges Error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// FOOD ACTIONS
// ==========================================

export async function searchFoods(query: string) {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) return [];
    return data;
}

export async function getAllFoodsLight() {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('foods')
        .select('id, name, brand, category, calories, protein, carbs, fats, serving_size, unit')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching all foods:', error);
        return [];
    }
    return data;
}

export async function createFood(foodData: {
    name: string;
    brand?: string;
    category?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    serving_size: number;
    unit: string;
}) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data, error } = await supabase
        .from('foods')
        .insert({
            name: foodData.name,
            brand: foodData.brand || null,
            // category: foodData.category || null, // Check if category exists in checking schema?
            calories: foodData.calories,
            protein: foodData.protein,
            carbs: foodData.carbs,
            fats: foodData.fats,
            serving_size: foodData.serving_size,
            unit: foodData.unit
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating food:', error);
        return { error: error.message };
    }

    revalidatePath('/foods');
    return { data };
}

export async function updateFood(id: string, foodData: Partial<{
    name: string;
    brand: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    serving_size: number;
    unit: string;
}>) {
    const supabase = createServerClient();

    const { data, error } = await supabase
        .from('foods')
        .update(foodData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating food:', error);
        return { error: error.message };
    }

    revalidatePath('/foods');
    return { data };
}

export async function deleteFoods(ids: string[]) {
    const supabase = createServerClient();

    const { error } = await supabase
        .from('foods')
        .delete()
        .in('id', ids);

    if (error) {
        console.error('Error deleting foods:', error);
        return { error: error.message };
    }

    revalidatePath('/foods');
    return { success: true };
}

// ==========================================
// CLIENTS ACTIONS
// ==========================================

export async function getClients(type: 'athlete' | 'gym') {
    const supabase = createServerClient();

    // Basic fetch for now
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('type', type)
        .order('name');

    if (error) return [];
    return data;
}


export async function getClient(id: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('clients')
        .select('*, gym:gym_id(name)')
        .eq('id', id)
        .single();

    if (!error && data) return data;
    return null;
}

// Helper to ensure coach exists (Simplified for Nutrition)
async function ensureCoach(supabase: any) {
    // ... (Keep existing logic if needed, but for now assuming users are coaches)
    // For simplicity in Nutrition MVP, we skip complex "Demo Mode" fallback unless needed.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return user.id; // Or fetch coach profile
}
