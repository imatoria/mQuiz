-- Fix infinite recursion by removing problematic functions and policies

-- Drop the function that causes recursion
DROP FUNCTION IF EXISTS public.can_view_scheduled_test(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_manage_scheduled_test(uuid, uuid);

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Tests assigned to all children" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Tests specifically assigned to user" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can view their own created tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can create their own scheduled tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can delete their own created tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can update their own created tests" ON public.scheduled_tests;

-- Create simple, non-recursive policies
-- Allow reading tests assigned to all
CREATE POLICY "view_tests_assigned_to_all" 
ON public.scheduled_tests 
FOR SELECT 
USING (assign_to_all = true);

-- Allow reading tests created by the user
CREATE POLICY "view_own_created_tests" 
ON public.scheduled_tests 
FOR SELECT 
USING (creator_id = auth.uid());

-- Allow reading tests specifically assigned (via separate table)
CREATE POLICY "view_specifically_assigned_tests" 
ON public.scheduled_tests 
FOR SELECT 
USING (
  id IN (
    SELECT scheduled_test_id 
    FROM test_assignments 
    WHERE assigned_to_user_id = auth.uid()
  )
);

-- Allow creators to manage their tests
CREATE POLICY "manage_own_tests" 
ON public.scheduled_tests 
FOR ALL 
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());