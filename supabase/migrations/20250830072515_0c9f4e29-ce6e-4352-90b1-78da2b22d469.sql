-- Add policy to allow students to view question papers for tests assigned to them
CREATE POLICY "Students can view question papers for assigned tests" 
ON public.question_papers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM scheduled_tests st
    WHERE st.question_paper_id = question_papers.id
    AND can_view_scheduled_test(st.id, auth.uid())
  )
);