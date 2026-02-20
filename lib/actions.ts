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
type AppRole = 'admin' | 'nutritionist' | 'patient';
type LegacyRole = 'admin' | 'coach' | 'athlete' | 'gym' | 'nutritionist' | 'patient' | null | undefined;
type LegacyClientType = 'athlete' | 'gym' | 'patient' | 'clinic';

function normalizeRole(role: LegacyRole): AppRole {
    if (role === 'admin') return 'admin';
    if (role === 'patient' || role === 'athlete') return 'patient';
    return 'nutritionist';
}

function normalizeClientType(type: LegacyClientType): 'patient' | 'clinic' {
    if (type === 'clinic' || type === 'gym') return 'clinic';
    return 'patient';
}

function legacyClientType(type: 'patient' | 'clinic') {
    return type === 'patient' ? 'athlete' : 'gym';
}

// ==========================================
// USER ROLE - For Sidebar SSR
// ==========================================

import { cookies } from 'next/headers';

export async function getUserRole(): Promise<AppRole> {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 'nutritionist';

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return normalizeRole(profile?.role as LegacyRole);
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
    let role: AppRole = 'nutritionist';
    let userName = 'Nutricionista';

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

        role = normalizeRole(profile?.role as LegacyRole);
        userName = profile?.full_name || user?.user_metadata?.full_name || 'Nutricionista';
    }

    if (role === 'patient') {
        return {
            showStats: false,
            userName,
            athletes: 0,
            gyms: 0,
            activePlans: 0,
            totalMeals: 0,
            totalFoods: 0
        };
    }

    // Run parallel queries
    const [
        { count: patients },
        { count: clinics },
        { count: plans },
        { count: foods }
    ] = await Promise.all([
        adminSupabase.from('clients').select('*', { count: 'exact', head: true }).in('type', ['patient', 'athlete']),
        adminSupabase.from('clients').select('*', { count: 'exact', head: true }).in('type', ['clinic', 'gym']),
        adminSupabase.from('nutritional_plans').select('*', { count: 'exact', head: true }).eq('is_active', true),
        // Foods count (Global)
        adminSupabase.from('foods').select('*', { count: 'exact', head: true })
    ]);

    return {
        showStats: true,
        userName,
        athletes: patients || 0,
        gyms: clinics || 0,
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
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Use Service Role to bypass RLS
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    try {
        // 1. Check user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        const role = normalizeRole(profile?.role as LegacyRole);

        // 2. Patient logic: only plans assigned to their own client row
        if (role === 'patient') {
            // Find client record linked to this user
            const { data: client } = await adminSupabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!client) return [];


            // Fetch plans assigned to this client
            const { data, error } = await adminSupabase
                .from('nutritional_plans')
                .select(`*, client:clients(*)`)
                .eq('client_id', client.id)
                .eq('is_active', true)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching patient plans:', error);
                return [];
            }
            return data || [];
        }

        // 3. Admin and nutritionists can see all plans
        if (role === 'admin' || role === 'nutritionist') {
            const { data, error } = await adminSupabase
                .from('nutritional_plans')
                .select(`*, client:clients(*)`)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching plans (admin):', error);
                return [];
            }
            return data || [];
        }
        return [];

    } catch (err) {
        console.error('Unexpected error in getNutritionalPlans:', err);
        return [];
    }
}

export async function getNutritionalPlan(id: string) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const role = normalizeRole(profile?.role as LegacyRole);

    // Use admin client to bypass RLS for nested queries (plan_days, meals, meal_items)
    // RLS policies are not yet configured for these tables
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    // Fetch Plan with nested days and meals and items
    // Nested query: plan -> days -> meals -> meal_items -> food

    const { data, error } = await adminSupabase
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

    // Verify access for security (manual check since we bypassed RLS)
    if (data) {
        const isAdmin = role === 'admin';
        const isNutritionist = role === 'nutritionist';
        const isOwner = data.user_id === user.id;

        if (!isAdmin && !isNutritionist && !isOwner) {
            // Patients can access plans assigned to their own client record.
            if (role === 'patient') {
                const { data: client } = await adminSupabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (!client || data.client_id !== client.id) {
                    console.warn('Patient attempted to access a plan not assigned to their client');
                    return null;
                }
            } else {
                console.warn('User attempted to access plan they do not own');
                return null;
            }
        }
    }

    // Sort logic (Supabase doesn't always sort nested arrays deeply)
    if (data && data.days) {
        data.days.sort((a: any, b: any) => a.order - b.order);
        data.days.forEach((day: any) => {
            if (day.meals) {
                day.meals.sort((a: any, b: any) => a.order - b.order);
                day.meals.forEach((meal: any) => {
                    if (meal.items) {
                        meal.items.sort((a: any, b: any) => a.order - b.order);
                    }
                });
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
        globalFocus?: string;
        startDate?: string;
        endDate?: string;
        duration?: number;
        weeklyFocusLabels?: string[];
    }
) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    // Use admin client to bypass RLS for creation if needed
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    try {
        // Map wizard options to schema
        let finalDescription = options?.description || options?.globalFocus;
        if (options?.startDate && options?.duration) {
            finalDescription = `${finalDescription ? finalDescription + '\n\n' : ''}Start: ${options.startDate}, Duration: ${options.duration} weeks`;
        }

        // 1. Create Plan Header
        const { data: plan, error: planError } = await adminSupabase
            .from('nutritional_plans')
            .insert({
                user_id: user.id, // Owner
                name,
                description: finalDescription || null,
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
            day_of_week: i,
            name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
            order: i
        }));

        const { error: daysError } = await adminSupabase
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

async function canEditPlan(
    adminSupabase: any,
    userId: string,
    role: AppRole,
    planId: string
) {
    const { data: planData, error } = await adminSupabase
        .from('nutritional_plans')
        .select('id, user_id, client_id')
        .eq('id', planId)
        .single();

    const plan = planData as { id: string; user_id: string | null; client_id: string | null } | null;
    if (error || !plan) return false;

    if (role === 'admin' || role === 'nutritionist') return true;
    if (plan.user_id === userId) return true;

    if (role === 'patient') {
        const { data: patientClient } = await adminSupabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .single();

        return !!patientClient && plan.client_id === patientClient.id;
    }

    return false;
}

export async function updateNutritionalPlan(id: string, updates: any) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const role = normalizeRole(profile?.role as LegacyRole);

    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const allowed = await canEditPlan(adminSupabase, user.id, role, id);
    if (!allowed) return { success: false, error: 'Forbidden' };

    const { data, error } = await adminSupabase
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const role = normalizeRole(profile?.role as LegacyRole);

    // Use Admin Client for atomic complex operations if possible, or just normal client
    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        : supabase;

    try {
        const allowed = await canEditPlan(adminSupabase as any, user.id, role, planId);
        if (!allowed) {
            return { success: false, error: 'Forbidden' };
        }

        console.log(`Saving plan ${planId}...`);

        for (const day of days) {
            // 1. Update Day Info
            // We assume day ID exists (it was created at plan creation)
            const dayUpdatePayload = {
                training_slot: day.training_slot || 'rest',
                target_calories: day.target_calories,
                target_protein: day.target_protein,
                target_carbs: day.target_carbs,
                target_fats: day.target_fats
            };

            let { error: dayUpdateError } = await adminSupabase
                .from('plan_days')
                .update(dayUpdatePayload)
                .eq('id', day.id);

            // Backward compatibility for environments where training_slot migration wasn't applied yet.
            if (dayUpdateError && dayUpdateError.message?.includes('training_slot')) {
                const { training_slot, ...legacyPayload } = dayUpdatePayload;
                ({ error: dayUpdateError } = await adminSupabase
                    .from('plan_days')
                    .update(legacyPayload)
                    .eq('id', day.id));
            }

            if (dayUpdateError) throw dayUpdateError;

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
                            food_id: item.food_id || item.food?.id,
                            quantity: item.quantity,
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

    const insertPayload = {
        name: foodData.name,
        brand: foodData.brand || null,
        category: foodData.category || 'Otros',
        calories: foodData.calories,
        protein: foodData.protein,
        carbs: foodData.carbs,
        fats: foodData.fats,
        serving_size: foodData.serving_size,
        unit: foodData.unit
    };

    let { data, error } = await supabase
        .from('foods')
        .insert(insertPayload)
        .select()
        .single();

    // Backward compatibility for environments where category migration wasn't applied yet.
    if (error && error.message?.includes('category')) {
        const { category, ...legacyPayload } = insertPayload;
        ({ data, error } = await supabase
            .from('foods')
            .insert(legacyPayload)
            .select()
            .single());
    }

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
    category: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    serving_size: number;
    unit: string;
}>) {
    const supabase = createServerClient();

    let { data, error } = await supabase
        .from('foods')
        .update(foodData)
        .eq('id', id)
        .select()
        .single();

    // Backward compatibility for environments where category migration wasn't applied yet.
    if (error && error.message?.includes('category')) {
        const { category, ...legacyData } = foodData;
        ({ data, error } = await supabase
            .from('foods')
            .update(legacyData)
            .eq('id', id)
            .select()
            .single());
    }

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

export async function getClients(type: LegacyClientType) {
    const supabase = createServerClient();
    const normalizedType = normalizeClientType(type);
    const acceptedTypes = normalizedType === 'patient'
        ? ['patient', 'athlete']
        : ['clinic', 'gym'];

    // Basic fetch for now
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('type', acceptedTypes)
        .order('name');

    if (error) return [];
    return data;
}


export async function getClient(id: string) {
    const supabase = createServerClient();
    let { data, error } = await supabase
        .from('clients')
        .select('*, clinic:clinic_id(name), gym:clinic_id(name)')
        .eq('id', id)
        .single();

    // Backward compatibility for environments where clinic_id is not yet available.
    if (error && error.message?.includes('clinic_id')) {
        ({ data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single());
    }

    if (!error && data) return data;
    return null;
}

export async function createClient(clientData: {
    type: LegacyClientType;
    name: string;
    email?: string;
    notes?: string;
    user_id?: string;
    clinic_id?: string;
    details?: any;
    gym_id?: string;
    coach_id?: string;
}) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const normalizedType = normalizeClientType(clientData.type);
    const insertPayload = {
        type: normalizedType,
        name: clientData.name,
        email: clientData.email || null,
        notes: clientData.notes || clientData.details?.notes || null,
        user_id: clientData.user_id || null,
        clinic_id: clientData.clinic_id || clientData.gym_id || null
    };

    let { data, error } = await supabase
        .from('clients')
        .insert(insertPayload)
        .select()
        .single();

    // Backward compatibility for environments where clinic_id migration is not applied yet.
    if (error && error.message?.includes('clinic_id')) {
        const { clinic_id, ...legacyPayload } = insertPayload;
        ({ data, error } = await supabase
            .from('clients')
            .insert(legacyPayload)
            .select()
            .single());
    }

    if (error) {
        console.error('Error creating client:', error);
        return { error: error.message };
    }

    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/athletes');
    revalidatePath('/gyms');
    return { data };
}

export async function deleteClient(id: string) {
    const supabase = createServerClient();
    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/athletes');
    revalidatePath('/gyms');
    return { success: true };
}
// ==========================================
// ADMIN USER ACTIONS
// ==========================================

async function requireAdmin() {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, error: 'Unauthorized' as const };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = normalizeRole(profile?.role as LegacyRole);
    if (role !== 'admin') return { user: null, error: 'Forbidden' as const };

    return { user, error: null };
}

export async function getProfiles() {
    const adminGuard = await requireAdmin();
    if (adminGuard.error) return [];

    const adminSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        ) : createServerClient();

    const { data, error } = await adminSupabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching profiles:", error);
        return [];
    }
    return data;
}

export async function updateUserRole(userId: string, role: string) {
    const adminGuard = await requireAdmin();
    if (adminGuard.error) return { error: adminGuard.error };

    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const normalizedRole = normalizeRole(role as LegacyRole);

    const { error } = await adminSupabase
        .from('profiles')
        .update({ role: normalizedRole })
        .eq('id', userId);

    if (error) throw new Error(error.message);

    const { data: targetProfile } = await adminSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

    const targetType = normalizedRole === 'patient'
        ? 'patient'
        : normalizedRole === 'nutritionist'
            ? 'clinic'
            : null;

    if (targetType) {
        const payload: Record<string, any> = {
            type: targetType,
            name: targetProfile?.full_name || targetProfile?.email || 'Usuario',
            email: targetProfile?.email || null,
            user_id: userId
        };
        const { data: existingClient } = await adminSupabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existingClient?.id) {
            let { error: clientError } = await adminSupabase
                .from('clients')
                .update(payload)
                .eq('id', existingClient.id);
            if (clientError && clientError.message?.toLowerCase().includes('invalid input value')) {
                const legacyPayload = { ...payload, type: legacyClientType(targetType) };
                await adminSupabase
                    .from('clients')
                    .update(legacyPayload)
                    .eq('id', existingClient.id);
            }
        } else {
            let { error: clientError } = await adminSupabase
                .from('clients')
                .insert(payload);
            if (clientError && clientError.message?.toLowerCase().includes('invalid input value')) {
                const legacyPayload = { ...payload, type: legacyClientType(targetType) };
                await adminSupabase
                    .from('clients')
                    .insert(legacyPayload);
            }
        }
    }

    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUser(userId: string) {
    const adminGuard = await requireAdmin();
    if (adminGuard.error) return { error: adminGuard.error };

    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await adminSupabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    revalidatePath('/admin/users');
    return { success: true };
}

export async function createUser(userData: any) {
    const adminGuard = await requireAdmin();
    if (adminGuard.error) return { success: false, message: adminGuard.error };

    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const normalizedRole = normalizeRole(userData.role as LegacyRole);
    const { data, error } = await adminSupabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password || 'tempPass123!',
        user_metadata: { full_name: userData.fullName, role: normalizedRole },
        email_confirm: true
    });

    if (error) throw new Error(error.message);

    if (data.user) {
        const profilePayload = {
            id: data.user.id,
            email: userData.email || data.user.email || null,
            full_name: userData.fullName || data.user.user_metadata?.full_name || data.user.email || 'Usuario',
            role: normalizedRole,
            onboarding_completed: true
        };

        const { error: profileSyncError } = await adminSupabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

        if (profileSyncError) {
            console.error('Error syncing profile for created user:', profileSyncError);
            // Fallback update in case upsert policies/schema differ.
            await adminSupabase
                .from('profiles')
                .update({
                    role: normalizedRole,
                    onboarding_completed: true
                })
                .eq('id', data.user.id);
        }

        // Keep clients table aligned with auth users.
        const defaultClientType = normalizedRole === 'patient' ? 'patient' : normalizedRole === 'nutritionist' ? 'clinic' : null;
        if (defaultClientType) {
            const baseClientPayload: Record<string, any> = {
                type: defaultClientType,
                name: userData.fullName || userData.email,
                email: userData.email || null,
                user_id: data.user.id
            };

            if (defaultClientType === 'patient' && userData.clinicId) {
                baseClientPayload.clinic_id = userData.clinicId;
            }

            const { data: existingClient } = await adminSupabase
                .from('clients')
                .select('id')
                .eq('user_id', data.user.id)
                .maybeSingle();

            let clientError: any = null;
            if (existingClient?.id) {
                ({ error: clientError } = await adminSupabase
                    .from('clients')
                    .update(baseClientPayload)
                    .eq('id', existingClient.id));
            } else {
                ({ error: clientError } = await adminSupabase
                    .from('clients')
                    .insert(baseClientPayload));
            }

            if (clientError && clientError.message?.toLowerCase().includes('invalid input value')) {
                const legacyPayload = {
                    ...baseClientPayload,
                    type: legacyClientType(defaultClientType as 'patient' | 'clinic')
                };
                if (existingClient?.id) {
                    ({ error: clientError } = await adminSupabase
                        .from('clients')
                        .update(legacyPayload)
                        .eq('id', existingClient.id));
                } else {
                    ({ error: clientError } = await adminSupabase
                        .from('clients')
                        .insert(legacyPayload));
                }
            }

            if (clientError && clientError.message?.includes('clinic_id')) {
                const { clinic_id, ...legacyPayload } = baseClientPayload;
                if (existingClient?.id) {
                    ({ error: clientError } = await adminSupabase
                        .from('clients')
                        .update(legacyPayload)
                        .eq('id', existingClient.id));
                } else {
                    ({ error: clientError } = await adminSupabase
                        .from('clients')
                        .insert(legacyPayload));
                }
            }

            if (clientError) {
                console.error('Error syncing user client row:', clientError);
            }
        }
    }

    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/admin/users');
    return { success: true, message: 'Usuario creado' };
}

export async function resetUserPassword(userId: string) {
    const adminGuard = await requireAdmin();
    if (adminGuard.error) return { success: false, message: adminGuard.error };

    const adminSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: fetchError } = await adminSupabase.auth.admin.getUserById(userId);
    if (fetchError || !user || !user.email) throw new Error("User not found or no email");

    const { error } = await adminSupabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/account/settings`,
    });

    if (error) throw new Error(error.message);
    return { success: true, message: 'Correo de recuperación enviado' };
}

export async function getClientPrograms(clientId: string) {
    const supabase = createServerClient();

    // Fetch plans assigned to this client
    const { data, error } = await supabase
        .from('nutritional_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching client programs:', error);
        return [];
    }
    return data;
}

export async function getCoaches() {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('clients')
        .select('id, name, user_id')
        .eq('type', 'clinic')
        .order('name', { ascending: true });

    if (error) return [];
    return (data || []).map((clinic) => ({
        id: clinic.id,
        full_name: clinic.name,
        business_name: clinic.name,
        user_id: clinic.user_id
    }));
}

export async function assignClientToCoach(clientId: string, coachId: string) {
    const supabase = createServerClient();
    let { error } = await supabase
        .from('clients')
        .update({ clinic_id: coachId })
        .eq('id', clientId);

    // Backward compatibility guard for schemas without clinic_id
    if (error && error.message?.includes('clinic_id')) {
        throw new Error('La base de datos no tiene clinic_id. Ejecuta la migración de reconciliación.');
    }

    if (error) throw new Error(error.message);
    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/athletes');
    return { success: true };
}

export async function updateAthleteProfile(userId: string, profileData: any) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        return { error: error.message };
    }

    revalidatePath('/account/settings');
    return { success: true, data };
}

export async function getFoods({
    query,
    category,
    page = 1,
    limit = 50
}: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
} = {}) {
    const supabase = createServerClient();
    let queryBuilder = supabase
        .from('foods')
        .select('*', { count: 'exact' });

    if (query) {
        queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    if (category && category !== 'all') {
        queryBuilder = queryBuilder.eq('category', category);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await queryBuilder
        .range(from, to)
        .order('name');

    if (error) {
        console.error('Error fetching foods:', error);
        return { data: [], count: 0 };
    }

    return { data, count };
}

export async function getEquipmentCatalog() {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('equipment_catalog')
        .select('*')
        .order('category');

    if (error) return [];
    return data;
}

export async function getTrainingMethodologies() {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('training_methodologies').select('*');
    if (error) return [];
    return data;
}

export async function updateTrainingMethodology(id: string, updates: any) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('training_methodologies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/knowledge');
    return { data };
}

// Aliases for legacy compatibility
// Wrapper functions instead of aliases to avoid Next.js $$id redefine bug
export async function getPrograms() {
    return getNutritionalPlans();
}

export async function createProgram(
    name: string,
    type: string | null,
    options?: any
) {
    return createNutritionalPlan(name, type, options);
}

export async function getCoachStatus() {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { isAthlete: false, hasCoach: false };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = normalizeRole(profile?.role as LegacyRole);

    if (role === 'patient') {
        // A patient is considered "linked" when it has a clinic relation.
        let { data: client } = await supabase
            .from('clients')
            .select('clinic_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!client) {
            ({ data: client } = await supabase
                .from('clients')
                .select('clinic_id')
                .eq('email', user.email)
                .maybeSingle());
        }

        return {
            isAthlete: true,
            hasCoach: !!client?.clinic_id
        };
    }

    return { isAthlete: false, hasCoach: false };
}

export async function updateClient(clientId: string, updates: any) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

    if (error) {
        console.error('Error updating client:', error);
        return { error: error.message };
    }

    revalidatePath('/patients');
    revalidatePath('/clinics');
    revalidatePath('/athletes');
    revalidatePath('/gyms');
    return { data };
}

export async function updateGymProfile(gymId: string, updates: any) {
    // Re-use updateClient as they are the same table
    return updateClient(gymId, updates);
}

export async function updateClinicProfile(clinicId: string, updates: any) {
    return updateClient(clinicId, updates);
}
