const https = require('https');

// Read from .env.local or hardcoded for this session
const PROJECT_REF = 'jkuhzdicmfjvnrdznvoh';
const ACCESS_TOKEN = 'sbp_c72c8c9fa74ffb292fb7f64ec3adccdded492506';

const sql = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. ENSURE PROFILES EXISTS (Base Schema)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role text, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Columns from athlete_profile
    birth_date DATE,
    height INT,
    weight NUMERIC(5,2),
    main_goal TEXT,
    training_place TEXT,
    equipment_list JSONB,
    days_per_week INT,
    minutes_per_session INT,
    experience_level TEXT,
    injuries TEXT,
    training_preferences TEXT,
    whatsapp_number TEXT,
    avatar_url TEXT
);

-- Enable RLS on Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Handle new User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. DROP OLD FITNESS TABLES
DROP TABLE IF EXISTS "exercise_progress" CASCADE;
DROP TABLE IF EXISTS "personal_bests" CASCADE;
DROP TABLE IF EXISTS "workout_logs" CASCADE;
DROP TABLE IF EXISTS "sets" CASCADE;
DROP TABLE IF EXISTS "blocks" CASCADE;
DROP TABLE IF EXISTS "workouts" CASCADE;
DROP TABLE IF EXISTS "exercises" CASCADE;
DROP TABLE IF EXISTS "programs" CASCADE;
DROP TABLE IF EXISTS "program_weeks" CASCADE;
DROP TABLE IF EXISTS "program_days" CASCADE;
DROP TABLE IF EXISTS "mesocycles" CASCADE;
DROP TABLE IF EXISTS "days" CASCADE;
DROP TABLE IF EXISTS "workout_blocks" CASCADE;
DROP TABLE IF EXISTS "coaches" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;

-- 2. CREATE NEW NUTRITION TABLES
CREATE TABLE IF NOT EXISTS "foods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now(),
  "name" text NOT NULL,
  "brand" text,
  "calories" numeric NOT NULL DEFAULT 0,
  "protein" numeric NOT NULL DEFAULT 0,
  "carbs" numeric NOT NULL DEFAULT 0,
  "fats" numeric NOT NULL DEFAULT 0,
  "unit" text DEFAULT 'g',
  "serving_size" numeric DEFAULT 100
);

CREATE TABLE IF NOT EXISTS "nutritional_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "user_id" uuid REFERENCES auth.users NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "type" text, 
  "is_active" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS "plan_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" uuid REFERENCES "nutritional_plans" ON DELETE CASCADE NOT NULL,
  "day_of_week" int,
  "name" text, 
  "target_calories" numeric DEFAULT 0,
  "target_protein" numeric DEFAULT 0,
  "target_carbs" numeric DEFAULT 0,
  "target_fats" numeric DEFAULT 0,
  "order" int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "meals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "day_id" uuid REFERENCES "plan_days" ON DELETE CASCADE NOT NULL,
  "name" text NOT NULL,
  "order" int DEFAULT 0,
  "time" time
);

CREATE TABLE IF NOT EXISTS "meal_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "meal_id" uuid REFERENCES "meals" ON DELETE CASCADE NOT NULL,
  "food_id" uuid REFERENCES "foods" ON DELETE RESTRICT NOT NULL,
  "quantity" numeric NOT NULL, 
  "order" int DEFAULT 0
);

-- 3. UPDATE PROFILES WITH NUTRITION FIELDS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tdee') THEN
        ALTER TABLE "profiles" ADD COLUMN "tdee" numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='dietary_goal') THEN
        ALTER TABLE "profiles" ADD COLUMN "dietary_goal" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='allergies') THEN
        ALTER TABLE "profiles" ADD COLUMN "allergies" text[];
    END IF;
END
$$;

-- 4. ENABLE RLS & POLICIES
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nutritional_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_items" ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Public foods are viewable by everyone" ON "foods";
DROP POLICY IF EXISTS "Users can create foods" ON "foods";
DROP POLICY IF EXISTS "Users can view own plans" ON "nutritional_plans";
DROP POLICY IF EXISTS "Users can insert own plans" ON "nutritional_plans";
DROP POLICY IF EXISTS "Users can update own plans" ON "nutritional_plans";
DROP POLICY IF EXISTS "Users can delete own plans" ON "nutritional_plans";

-- Basic Policies
CREATE POLICY "Public foods are viewable by everyone" ON "foods" FOR SELECT USING (true);
CREATE POLICY "Users can create foods" ON "foods" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view own plans" ON "nutritional_plans" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON "nutritional_plans" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON "nutritional_plans" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON "nutritional_plans" FOR DELETE USING (auth.uid() = user_id);

-- 5. SEED DATA
-- Check if foods exist inside the Insert to avoid duplicates if re-run (ignoring for now as table creation is IF NOT EXISTS but data insert might fail if unique constaint, but no unique constraint on name yet)
INSERT INTO foods (name, calories, protein, carbs, fats, unit, serving_size) VALUES
('Chicken Breast (Cooked)', 165, 31, 0, 3.6, 'g', 100),
('Rice (White, Cooked)', 130, 2.7, 28, 0.3, 'g', 100),
('Broccoli (Raw)', 34, 2.8, 6.6, 0.4, 'g', 100),
('Egg (Large)', 72, 6, 0.6, 5, 'unit', 1),
('Oats (Rolled)', 389, 16.9, 66, 6.9, 'g', 100),
('Banana', 89, 1.1, 23, 0.3, 'g', 100),
('Almonds', 579, 21, 22, 50, 'g', 100),
('Salmon (Atlantic)', 208, 20, 0, 13, 'g', 100),
('Sweet Potato (Raw)', 86, 1.6, 20, 0.1, 'g', 100),
('Olive Oil', 884, 0, 0, 100, 'g', 100);
`;

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Migration successful!');
        } else {
            console.error('Migration failed:', data);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('Error executing migration:', error);
    process.exit(1);
});

req.write(JSON.stringify({ query: sql }));
req.end();
