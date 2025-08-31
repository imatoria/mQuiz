-- First, let's create a security definer function to check if user can view a scheduled test
-- This will break the circular dependency between scheduled_tests and test_assignments policies

CREATE OR REPLACE FUNCTION public.can_view_scheduled_test(test_id uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM scheduled_tests 
    WHERE id = test_id AND creator_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if test is assigned to all
  IF EXISTS (
    SELECT 1 FROM scheduled_tests 
    WHERE id = test_id AND assign_to_all = true
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is specifically assigned to the test
  IF EXISTS (
    SELECT 1 FROM test_assignments 
    WHERE scheduled_test_id = test_id AND assigned_to_user_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Drop existing policies that cause circular dependency
DROP POLICY IF EXISTS "manage_own_tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "view_own_created_tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "view_specifically_assigned_tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "view_tests_assigned_to_all" ON public.scheduled_tests;

-- Create new simplified policies using the security definer function
CREATE POLICY "users_can_view_assigned_tests" ON public.scheduled_tests
FOR SELECT
USING (can_view_scheduled_test(id, auth.uid()));

CREATE POLICY "creators_can_manage_tests" ON public.scheduled_tests
FOR ALL
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Also update test_assignments policies to avoid circular dependency
DROP POLICY IF EXISTS "Users can view test assignments" ON public.test_assignments;

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