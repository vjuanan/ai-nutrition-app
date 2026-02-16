-- ================================================
-- Migration: Onboarding Nutrition Redesign
-- Role is TEXT in live DB, so no enum changes needed.
-- Add new columns for Patient and Nutritionist profiles.
-- ================================================

-- 1. Add onboarding_completed column (missing from live DB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Patient-specific profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nutrition_goal TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_allergies JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_allergies TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meals_per_day INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet_preference TEXT;

-- 3. Nutritionist-specific profile columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_modality TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approach JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 4. Optional validation (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT check_meals_per_day 
    CHECK (meals_per_day IS NULL OR (meals_per_day >= 1 AND meals_per_day <= 8));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT check_experience_years 
    CHECK (experience_years IS NULL OR (experience_years >= 0 AND experience_years <= 60));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Mark existing users as completed (they already went through onboarding)
UPDATE profiles SET onboarding_completed = TRUE WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
