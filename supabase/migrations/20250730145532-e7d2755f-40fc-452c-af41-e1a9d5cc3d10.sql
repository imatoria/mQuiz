-- Fix infinite recursion in profiles RLS policies
-- First, create a security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin' AND EXISTS (
  SELECT 1 FROM public.profiles p2 WHERE p2.user_id = auth.uid() AND p2.is_approved = true
));

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin' AND EXISTS (
  SELECT 1 FROM public.profiles p2 WHERE p2.user_id = auth.uid() AND p2.is_approved = true
));

-- Also add missing policies for children access to test assignments
CREATE POLICY "Children can view their assigned tests" 
ON public.test_assignments 
FOR SELECT 
USING (auth.uid() = assigned_to_user_id);

-- Add policy for children to view scheduled tests they are assigned to
CREATE POLICY "Children can view assigned scheduled tests" 
ON public.scheduled_tests 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.test_assignments 
  WHERE test_assignments.scheduled_test_id = scheduled_tests.id 
  AND test_assignments.assigned_to_user_id = auth.uid()
) OR assign_to_all = true);