-- Add soft delete columns to question_papers table
ALTER TABLE public.question_papers 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT null;