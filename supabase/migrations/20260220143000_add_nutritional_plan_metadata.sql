-- Add metadata JSON to nutritional plans for export branding and setup data
ALTER TABLE public.nutritional_plans
  ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.nutritional_plans
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.nutritional_plans
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.nutritional_plans.metadata IS 'Flexible metadata for plan setup/export branding (logo, clinic palette, export date, etc.).';
