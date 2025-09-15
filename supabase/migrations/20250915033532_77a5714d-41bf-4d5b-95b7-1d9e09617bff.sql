-- Tighten and correct RLS for parent toggling show_results on attempts of their own tests only
DROP POLICY IF EXISTS "Parents can update their children test attempts" ON public.test_attempts;

CREATE POLICY "Parents can update results for their own tests and children"
ON public.test_attempts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM parent_child_relationships pc
    JOIN scheduled_tests st ON st.id = test_attempts.scheduled_test_id
    WHERE pc.parent_id = auth.uid()
      AND pc.child_id = test_attempts.user_id
      AND st.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM parent_child_relationships pc
    JOIN scheduled_tests st ON st.id = test_attempts.scheduled_test_id
    WHERE pc.parent_id = auth.uid()
      AND pc.child_id = test_attempts.user_id
      AND st.creator_id = auth.uid()
  )
);