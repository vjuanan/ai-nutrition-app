-- ============================================================
-- Migration: Add nutrition planning metadata
-- - plan_days.training_slot
-- - foods.category
-- ============================================================

-- 1) Add per-day training slot selector for nutrition timing
ALTER TABLE plan_days
ADD COLUMN IF NOT EXISTS training_slot TEXT;

DO $$
BEGIN
  ALTER TABLE plan_days
  ADD CONSTRAINT check_plan_days_training_slot
  CHECK (
    training_slot IS NULL OR
    training_slot IN ('rest', 'morning', 'afternoon', 'night')
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE plan_days
SET training_slot = 'rest'
WHERE training_slot IS NULL;

ALTER TABLE plan_days
ALTER COLUMN training_slot SET DEFAULT 'rest';

-- 2) Add food category used by forms/filters/autocomplete metadata
ALTER TABLE foods
ADD COLUMN IF NOT EXISTS category TEXT;

UPDATE foods
SET category = 'Otros'
WHERE category IS NULL;

ALTER TABLE foods
ALTER COLUMN category SET DEFAULT 'Otros';
