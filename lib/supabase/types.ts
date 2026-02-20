// Database Types for AI Nutrition
// These match the Supabase schema

export type BlockType = 'meal' | 'snack';
// We simplify BlockType to just meal types if needed, or just "meal"
// Actually, user said: Block -> Meal. Meal has "name" (Breakfast, Lunch).
// So the "Type" might be just 'meal'.

export type Unit = 'g' | 'ml' | 'unit' | 'oz' | 'cup';

// Config for a Meal (List of items)
export interface MealConfig {
    items: MealItem[];
    notes?: string;
    [key: string]: any;
}

export interface MealItem {
    id: string; // Helper for UI (tempId) or DB ID
    food_id: string;
    quantity: number;
    unit?: string; // Derived from food but can be overriden or just for display
    order?: number;
    // Computed for ease of access (joined)
    food?: Food;
}


// Database Table Types
export interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: 'admin' | 'nutritionist' | 'patient' | 'coach' | 'athlete' | 'gym' | null;
    // Nutrition specific
    tdee?: number | null;
    dietary_goal?: 'cut' | 'bulk' | 'maintenance' | null;
    allergies?: string[] | null;

    // Kept from previous schema for compatibility or future use
    birth_date?: string | null;
    height?: number | null;
    weight?: number | null;
    avatar_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: string;
    user_id: string | null;
    clinic_id?: string | null;
    email: string;
    full_name?: string;
    name: string;
    status: 'active' | 'inactive' | 'pending';
    type: 'patient' | 'clinic' | 'athlete' | 'gym';

    // Optional metadata
    notes?: string | null;
    details?: any;

    created_at: string;
    updated_at: string;
}

export interface NutritionalPlan {
    id: string;
    user_id: string; // Owner (Coach/User)
    name: string;
    description: string | null;
    type: string | null; // Keto, Paleo...
    is_active: boolean;

    client_id?: string | null;
    created_at: string;
    updated_at: string;
}

// Flattened structure: Plan -> Days -> Meals
export interface PlanDay {
    id: string;
    plan_id: string;
    day_of_week: number | null; // 0-6
    name: string | null; // "Monday"
    training_slot?: 'rest' | 'morning' | 'afternoon' | 'night' | null;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    order: number;

    // Joined
    meals?: Meal[];
}

export interface Meal {
    id: string;
    day_id: string;
    name: string; // Breakfast, Lunch
    order: number;
    time?: string | null;

    // Joined
    items?: MealItem[]; // In DB this is a separate table, but in UI we nest it often
    // Or we use "config" JSONB if we want to keep the Block architecture?
    // User said: "Set -> Meal Item".
    // In DB I created 'meal_items' table.
    // But existing UI uses 'config' JSONB for block content.
    // To minimize refactor of BlockBuilder, maybe we should use JSONB for items initially?
    // User said: "Set -> Meal Item".
    // "Exercise -> Food/Ingredient".
    // If I use a separate table, I have to refactor the fetching logic significantly.
    // If I use JSONB 'config', I keep the "Block" architecture 1:1.
    // "BlockBuilder -> MealBuilder". "Series x Reps" -> "Cantidad x Unidad".
    // This implies we are editing the "Inside" of the block.
    // The "Inside" of a block was JSON config.
    // So "Meal" is the Block. "MealItems" are the contents of the config.
    // BUT I created a `meal_items` TABLE in migration.
    // Use the TABLE for data integrity, but in the UI store, we might treat it as a list.
    // For Types, let's define `Meal` to match the UI needs (Joined).
}

export interface Food {
    id: string;
    name: string;
    brand: string | null;
    category?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    unit: string; // 'g', 'ml', 'unit'
    serving_size: number;
    created_at: string;
}

export interface EquipmentCatalog {
    id: string;
    name: string;
    category: string;
    description: string | null;
    image_url: string | null;
}

export interface TrainingPrinciple {
    id: string;
    title: string;
    content: any;
    category: string;
    objective?: string;
    author?: string;
    decision_framework?: string;
    context_factors?: string[];
    tags?: string[];
    created_at: string;
}

export interface TrainingMethodology {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: string;
    code?: string;
    form_config: {
        fields: Array<{ key: string; label: string; type: string }>;
        [key: string]: any;
    };
    default_values: any;
}

// Legacy mappings/aliases to help refactor (Optional, remove if confident)
// export type Program = NutritionalPlan;
// export type Day = PlanDay;
// export type WorkoutBlock = Meal;

// Supabase Database Type
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
            };
            foods: {
                Row: Food;
                Insert: Omit<Food, 'id' | 'created_at'>;
                Update: Partial<Omit<Food, 'id'>>;
            };
            nutritional_plans: {
                Row: NutritionalPlan;
                Insert: Omit<NutritionalPlan, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<NutritionalPlan, 'id'>>;
            };
            plan_days: {
                Row: PlanDay;
                Insert: Omit<PlanDay, 'id'>;
                Update: Partial<Omit<PlanDay, 'id'>>;
            };
            meals: {
                Row: Meal;
                Insert: Omit<Meal, 'id'>;
                Update: Partial<Omit<Meal, 'id'>>;
            };
            meal_items: {
                Row: MealItem;
                Insert: Omit<MealItem, 'id'>; // ID might be autogenerated
                Update: Partial<Omit<MealItem, 'id'>>;
            };
        };
    };
}
