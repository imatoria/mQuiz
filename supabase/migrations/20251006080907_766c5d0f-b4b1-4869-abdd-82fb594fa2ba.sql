-- Phase 3.3: Drop legacy tables and enum

-- Drop subjects table (replaced by subjects_parent)
DROP TABLE IF EXISTS public.subjects CASCADE;

-- Drop encryption_keys table (never used, 0 rows)
DROP TABLE IF EXISTS public.encryption_keys CASCADE;

-- Drop class_level enum (must be last, replaced by classes_parent)
DROP TYPE IF EXISTS public.class_level CASCADE;