-- Add soft delete columns to questions table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Helpful index for filtering out deleted questions
CREATE INDEX IF NOT EXISTS idx_questions_not_deleted ON public.questions (document_id, page_number) WHERE is_deleted = false;

-- Optional index for referenced questions lookups
CREATE INDEX IF NOT EXISTS idx_questions_is_deleted ON public.questions (is_deleted);
