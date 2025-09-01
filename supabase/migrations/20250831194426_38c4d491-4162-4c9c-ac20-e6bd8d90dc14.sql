-- Add RLS policy to allow students to view question paper questions for assigned tests
CREATE POLICY "Students can view questions for assigned tests" 
ON question_paper_questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM scheduled_tests st 
    WHERE st.question_paper_id = question_paper_questions.question_paper_id 
    AND (
      -- For assign_to_all tests, allow any authenticated user to view
      st.assign_to_all = true 
      -- OR check if user is specifically assigned
      OR EXISTS (
        SELECT 1 
        FROM test_assignments ta 
        WHERE ta.scheduled_test_id = st.id 
        AND ta.assigned_to_user_id = auth.uid()
      )
    )
    -- Only allow if test is within its time window
    AND st.start_time <= now() 
    AND st.end_time >= now()
  )
);