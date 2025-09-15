-- First drop the RLS policies that depend on document_id
DROP POLICY IF EXISTS "Users can create questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions" ON public.questions;

-- Drop the document_id column
ALTER TABLE public.questions DROP COLUMN IF EXISTS document_id;

-- Recreate RLS policies without document_id dependency
CREATE POLICY "Users can create questions" ON public.questions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view questions" ON public.questions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update questions" ON public.questions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete questions" ON public.questions
FOR DELETE
USING (auth.uid() = user_id);