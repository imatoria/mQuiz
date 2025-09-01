-- Add RLS policy to allow students to view questions for tests they're taking
CREATE POLICY "Students can view questions for active tests" 
ON questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM question_paper_questions qpq
    JOIN scheduled_tests st ON st.question_paper_id = qpq.question_paper_id
    WHERE qpq.question_id = questions.id
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