-- Update RLS so assigned students can read paper questions

-- 1) question_paper_questions: allow select if the user can view the paper (creator, assigned, or assign_to_all & scheduled)
DROP POLICY IF EXISTS "Users can view question paper questions" ON public.question_paper_questions;
CREATE POLICY "Users can view questions for accessible papers"
ON public.question_paper_questions
AS PERMISSIVE
FOR SELECT
USING (
  public.can_view_scheduled_paper(question_paper_id, auth.uid())
);

-- 2) questions: keep owner access and additionally allow select if question appears in a paper the user can view
-- Create an additional permissive policy, do not remove the existing one
CREATE POLICY IF NOT EXISTS "Users can view questions in accessible papers"
ON public.questions
AS PERMISSIVE
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.question_paper_questions qpq
    WHERE qpq.question_id = questions.id
      AND public.can_view_scheduled_paper(qpq.question_paper_id, auth.uid())
  )
);
