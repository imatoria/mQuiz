-- Remove document_id column from questions table as it's no longer needed
-- Questions now use subject_id and class_level directly
ALTER TABLE public.questions DROP COLUMN IF EXISTS document_id;