-- Fix RLS policies for scheduled_tests to allow children to see assigned tests properly

-- Drop existing problematic policy  
DROP POLICY IF EXISTS "Children can view assigned tests" ON public.scheduled_tests;

-- Create a comprehensive policy for children viewing assigned tests
CREATE POLICY "Children can view assigned tests" 
ON public.scheduled_tests 
FOR SELECT 
USING (
  -- Test is assigned to all children 
  assign_to_all = true
  OR 
  -- Test is specifically assigned to this user
  EXISTS (
    SELECT 1 
    FROM public.test_assignments 
    WHERE test_assignments.scheduled_test_id = scheduled_tests.id 
    AND test_assignments.assigned_to_user_id = auth.uid()
  )
);