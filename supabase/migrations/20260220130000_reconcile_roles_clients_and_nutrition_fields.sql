-- ============================================================
-- Reconcile production schema to nutrition role model
-- Roles: admin | nutritionist | patient
-- Client types: clinic | patient
-- Also adds:
--   - clients.clinic_id
--   - plan_days.training_slot
--   - foods.category
-- ============================================================

-- 1) Ensure profile roles are TEXT and normalized
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN role DROP DEFAULT;

    ALTER TABLE public.profiles
      ALTER COLUMN role TYPE text USING role::text;
  END IF;
END $$;

UPDATE public.profiles
SET role = CASE
  WHEN role = 'coach' THEN 'nutritionist'
  WHEN role = 'athlete' THEN 'patient'
  WHEN role = 'gym' THEN 'nutritionist'
  WHEN role IS NULL OR btrim(role) = '' THEN 'patient'
  ELSE role
END;

DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_profiles_role_allowed;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT check_profiles_role_allowed
  CHECK (role IN ('admin', 'nutritionist', 'patient'));

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'patient';

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

-- 2) Ensure client type is TEXT and normalized
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clients'
      AND column_name = 'type'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.clients
      ALTER COLUMN type DROP DEFAULT;

    ALTER TABLE public.clients
      ALTER COLUMN type TYPE text USING type::text;
  END IF;
END $$;

UPDATE public.clients
SET type = CASE
  WHEN type = 'gym' THEN 'clinic'
  WHEN type = 'athlete' THEN 'patient'
  WHEN type IS NULL OR btrim(type) = '' THEN 'patient'
  ELSE type
END;

DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS check_clients_type_allowed;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.clients
  ADD CONSTRAINT check_clients_type_allowed
  CHECK (type IN ('clinic', 'patient'));

ALTER TABLE public.clients
  ALTER COLUMN type SET DEFAULT 'patient';

ALTER TABLE public.clients
  ALTER COLUMN type SET NOT NULL;

-- 3) Add patient -> clinic relationship
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_clinic_id ON public.clients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clients_type ON public.clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS check_clients_clinic_relation;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.clients
  ADD CONSTRAINT check_clients_clinic_relation
  CHECK (
    (type = 'clinic' AND clinic_id IS NULL)
    OR
    (type = 'patient')
  );

COMMENT ON COLUMN public.clients.clinic_id IS 'For patient rows, points to the owning clinic row (clients.id).';

-- 4) Add training slot metadata to plan days
ALTER TABLE public.plan_days
  ADD COLUMN IF NOT EXISTS training_slot text;

UPDATE public.plan_days
SET training_slot = 'rest'
WHERE training_slot IS NULL;

DO $$
BEGIN
  ALTER TABLE public.plan_days DROP CONSTRAINT IF EXISTS check_plan_days_training_slot;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.plan_days
  ADD CONSTRAINT check_plan_days_training_slot
  CHECK (training_slot IN ('rest', 'morning', 'afternoon', 'night'));

ALTER TABLE public.plan_days
  ALTER COLUMN training_slot SET DEFAULT 'rest';

ALTER TABLE public.plan_days
  ALTER COLUMN training_slot SET NOT NULL;

-- 5) Add category metadata to foods
ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS category text;

UPDATE public.foods
SET category = 'Otros'
WHERE category IS NULL OR btrim(category) = '';

ALTER TABLE public.foods
  ALTER COLUMN category SET DEFAULT 'Otros';

ALTER TABLE public.foods
  ALTER COLUMN category SET NOT NULL;

-- 6) Validation guardrails to block legacy values in domain columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role IN ('coach', 'athlete', 'gym')
  ) THEN
    RAISE EXCEPTION 'Legacy roles remain in profiles after reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clients
    WHERE type IN ('athlete', 'gym')
  ) THEN
    RAISE EXCEPTION 'Legacy client types remain in clients after reconciliation';
  END IF;
END $$;
