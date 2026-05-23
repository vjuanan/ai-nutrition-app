-- Add clinic value to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'clinic';

-- Create Clinic Profiles Table
CREATE TABLE public.clinic_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    clinic_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Clinic <-> Nutritionist relationship table
CREATE TABLE public.clinic_nutritionists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_clinic_nutritionist UNIQUE (clinic_id, nutritionist_id)
);

-- Create Clinic <-> Patient relationship table
CREATE TABLE public.clinic_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_clinic_patient UNIQUE (clinic_id, patient_id)
);

-- Expand Nutrition Plans with Clinic and Patient assignments
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS assigned_patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update trigger function handle_new_user to support clinic registration
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
    ELSIF user_role_val = 'clinic' THEN
        INSERT INTO public.clinic_profiles (id, clinic_name, address, phone)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'clinic_name', user_name),
            COALESCE(new.raw_user_meta_data->>'address', 'Dirección no declarada'),
            COALESCE(new.raw_user_meta_data->>'phone', '-')
        );
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE public.clinic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_nutritionists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_patients ENABLE ROW LEVEL SECURITY;

-- 1. Clinic Profiles Policies
CREATE POLICY "Allow public read access to clinic profiles" ON public.clinic_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow clinics to update their own profile" ON public.clinic_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Clinic Nutritionists Policies
CREATE POLICY "Allow members to view clinic nutritionists" ON public.clinic_nutritionists
    FOR SELECT USING (auth.uid() = clinic_id OR auth.uid() = nutritionist_id);

CREATE POLICY "Allow admins full access to clinic nutritionists" ON public.clinic_nutritionists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 3. Clinic Patients Policies
CREATE POLICY "Allow members to view clinic patients" ON public.clinic_patients
    FOR SELECT USING (
        auth.uid() = clinic_id OR 
        auth.uid() = patient_id OR
        EXISTS (
            SELECT 1 FROM public.clinic_nutritionists
            WHERE clinic_nutritionists.clinic_id = clinic_patients.clinic_id AND clinic_nutritionists.nutritionist_id = auth.uid()
        )
    );

CREATE POLICY "Allow admins full access to clinic patients" ON public.clinic_patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 4. Plan Day, Meal, and Item RLS Expansion for Clinics and Patients
CREATE POLICY "Allow clinics to view plans" ON public.nutrition_plans
    FOR SELECT USING (
        clinic_id = auth.uid() OR
        created_by = auth.uid() OR
        assigned_patient_id = auth.uid()
    );

CREATE POLICY "Allow clinics to update plans assigned to them" ON public.nutrition_plans
    FOR UPDATE USING (clinic_id = auth.uid());
