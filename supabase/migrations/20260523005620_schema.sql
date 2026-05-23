-- Custom Database Schema for AI Nutrition (AI Nutri)

-- Create Enums
CREATE TYPE public.user_role AS ENUM ('patient', 'nutritionist', 'admin');
CREATE TYPE public.meal_type AS ENUM ('desayuno', 'almuerzo', 'merienda', 'cena', 'colacion');

-- Create Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'patient',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Patient Profiles Table
CREATE TABLE public.patient_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    weight NUMERIC,
    height NUMERIC,
    objective TEXT,
    adherence NUMERIC DEFAULT 0,
    activity_level TEXT,
    diet_type TEXT,
    allergies TEXT,
    body_fat NUMERIC
);

-- Create Nutritionist Profiles Table
CREATE TABLE public.nutritionist_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialty TEXT,
    license_number TEXT
);

-- Create Assignments Table (Patient <-> Nutritionist vinculation)
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_patient_nutritionist UNIQUE (patient_id, nutritionist_id)
);

-- Create Nutrition Plans Table
CREATE TABLE public.nutrition_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    weeks_count INT NOT NULL DEFAULT 4,
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Plan Days Table
CREATE TABLE public.plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    name TEXT NOT NULL,
    is_refeed BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    CONSTRAINT unique_plan_day UNIQUE (plan_id, day_number)
);

-- Create Meals Table
CREATE TABLE public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
    type public.meal_type NOT NULL,
    name TEXT NOT NULL,
    time TEXT
);

-- Create Meal Items Table
CREATE TABLE public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
    food_id TEXT,
    recipe_id TEXT,
    qty TEXT NOT NULL
);

-- Create Trigger function for auth.users sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_name TEXT;
    user_role_val public.user_role;
BEGIN
    user_name := COALESCE(new.raw_user_meta_data->>'name', 'Usuario Nuevo');
    
    -- Check for explicit role or fallback
    BEGIN
        user_role_val := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role);
    EXCEPTION WHEN OTHERS THEN
        user_role_val := 'patient'::public.user_role;
    END;

    -- Insert into global profiles
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new.id, new.email, user_name, user_role_val);

    -- Insert into specific profile tables based on role
    IF user_role_val = 'patient' THEN
        INSERT INTO public.patient_profiles (
            id, weight, height, objective, adherence, activity_level, diet_type, allergies, body_fat
        ) VALUES (
            new.id,
            COALESCE((new.raw_user_meta_data->>'weight')::numeric, 70.0),
            COALESCE((new.raw_user_meta_data->>'height')::numeric, 170.0),
            COALESCE(new.raw_user_meta_data->>'objective', 'Pérdida de grasa'),
            0,
            COALESCE(new.raw_user_meta_data->>'activity_level', 'Moderadamente activo'),
            COALESCE(new.raw_user_meta_data->>'diet_type', 'Omnívora'),
            COALESCE(new.raw_user_meta_data->>'allergies', 'Ninguna declarada'),
            COALESCE((new.raw_user_meta_data->>'body_fat')::numeric, 15.0)
        );
    ELSIF user_role_val = 'nutritionist' THEN
        INSERT INTO public.nutritionist_profiles (id, specialty, license_number)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'specialty', 'Nutrición General'),
            COALESCE(new.raw_user_meta_data->>'license_number', 'MN-XXXX')
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutritionist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Patient Profiles Policies
CREATE POLICY "Allow patients to read own clinical profile" ON public.patient_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow patients to update own clinical profile" ON public.patient_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow assigned nutritionists to view patient clinical profiles" ON public.patient_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments 
            WHERE assignments.patient_id = patient_profiles.id AND assignments.nutritionist_id = auth.uid()
        )
    );

CREATE POLICY "Allow assigned nutritionists to update patient clinical profiles" ON public.patient_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.assignments 
            WHERE assignments.patient_id = patient_profiles.id AND assignments.nutritionist_id = auth.uid()
        )
    );

CREATE POLICY "Allow admins to read all patient profiles" ON public.patient_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admins to update all patient profiles" ON public.patient_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 3. Nutritionist Profiles Policies
CREATE POLICY "Allow public read access to nutritionist profiles" ON public.nutritionist_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow nutritionists to update their own profile" ON public.nutritionist_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Assignments Policies
CREATE POLICY "Allow users to view their own assignments" ON public.assignments
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id);

CREATE POLICY "Allow admins full access to assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 5. Nutrition Plans Policies
CREATE POLICY "Allow users to view plans they own or are assigned to" ON public.nutrition_plans
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.assignments
            WHERE assignments.patient_id = auth.uid() AND assignments.nutritionist_id = nutrition_plans.created_by
        )
    );

CREATE POLICY "Allow nutritionists to create plans" ON public.nutrition_plans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'nutritionist' OR profiles.role = 'admin')
        )
    );

CREATE POLICY "Allow nutritionists to update plans they created" ON public.nutrition_plans
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Allow nutritionists to delete plans they created" ON public.nutrition_plans
    FOR DELETE USING (created_by = auth.uid());

-- 6. Plan Days Policies
CREATE POLICY "Allow users to view plan days if they can view the plan" ON public.plan_days
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.nutrition_plans
            WHERE nutrition_plans.id = plan_days.plan_id
        )
    );

CREATE POLICY "Allow plan creators to manage plan days" ON public.plan_days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.nutrition_plans
            WHERE nutrition_plans.id = plan_days.plan_id AND nutrition_plans.created_by = auth.uid()
        )
    );

-- 7. Meals Policies
CREATE POLICY "Allow users to view meals if they can view the day" ON public.meals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.plan_days
            WHERE plan_days.id = meals.day_id
        )
    );

CREATE POLICY "Allow plan creators to manage meals" ON public.meals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.plan_days
            JOIN public.nutrition_plans ON nutrition_plans.id = plan_days.plan_id
            WHERE plan_days.id = meals.day_id AND nutrition_plans.created_by = auth.uid()
        )
    );

-- 8. Meal Items Policies
CREATE POLICY "Allow users to view meal items if they can view the meal" ON public.meal_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meals
            WHERE meals.id = meal_items.meal_id
        )
    );

CREATE POLICY "Allow plan creators to manage meal items" ON public.meal_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.meals
            JOIN public.plan_days ON plan_days.id = meals.day_id
            JOIN public.nutrition_plans ON nutrition_plans.id = plan_days.plan_id
            WHERE meals.id = meal_items.meal_id AND nutrition_plans.created_by = auth.uid()
        )
    );
