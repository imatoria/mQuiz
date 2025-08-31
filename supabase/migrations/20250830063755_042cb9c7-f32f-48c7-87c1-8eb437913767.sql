-- Fix infinite recursion in scheduled_tests RLS policies

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Children can view assigned tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can view their own scheduled tests" ON public.scheduled_tests;

-- Create new policies that don't cause recursion
-- Policy for children to view tests assigned to all
CREATE POLICY "Tests assigned to all children" 
ON public.scheduled_tests 
FOR SELECT 
USING (assign_to_all = true);

-- Policy for children to view specifically assigned tests
CREATE POLICY "Tests specifically assigned to user" 
ON public.scheduled_tests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.test_assignments 
    WHERE test_assignments.scheduled_test_id = scheduled_tests.id 
    AND test_assignments.assigned_to_user_id = auth.uid()
  )
);

-- Policy for users to view tests they created
CREATE POLICY "Users can view their own created tests" 
ON public.scheduled_tests 
FOR SELECT 
USING (creator_id = auth.uid());