-- ================================================
-- Migration: Update handle_new_user trigger for Nutrition app
-- Default role changes from 'athlete' to 'patient'
-- Role is TEXT in live DB (not enum)
-- ================================================

-- Drop and recreate the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    input_role TEXT := 'patient';
    input_full_name TEXT;
    extracted_role TEXT;
BEGIN
    -- Extract full name
    input_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        split_part(NEW.email, '@', 1)
    );

    -- Check metadata for role override
    extracted_role := NEW.raw_user_meta_data->>'role';
    
    IF extracted_role IS NOT NULL AND extracted_role IN ('coach', 'athlete', 'admin', 'gym', 'patient', 'nutritionist') THEN
        input_role := extracted_role;
    END IF;

    -- Insert profile with onboarding_completed = FALSE to force onboarding flow
    INSERT INTO public.profiles (id, email, full_name, role, onboarding_completed)
    VALUES (
        NEW.id, 
        NEW.email, 
        input_full_name,
        input_role,
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user warning for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Reset test user for onboarding verification
UPDATE profiles 
SET onboarding_completed = FALSE, role = 'patient'
WHERE email = 'vjuanan@gmail.com';
