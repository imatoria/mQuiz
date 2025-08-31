-- Fix test_assignments policies to avoid circular dependency
DROP POLICY IF EXISTS "Users can view test assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "users_can_view_their_assignments" ON public.test_assignments;
DROP POLICY IF EXISTS "creators_can_view_test_assignments" ON public.test_assignments;

-- Create clean policies for test_assignments
CREATE POLICY "users_can_view_their_assignments" ON public.test_assignments
FOR SELECT
USING (assigned_to_user_id = auth.uid());

CREATE POLICY "creators_can_view_test_assignments" ON public.test_assignments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM scheduled_tests 
  WHERE scheduled_tests.id = test_assignments.scheduled_test_id 
  AND scheduled_tests.creator_id = auth.uid()
));