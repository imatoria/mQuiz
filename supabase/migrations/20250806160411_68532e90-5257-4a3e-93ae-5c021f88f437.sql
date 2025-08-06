-- Create the missing function for scheduled test access
CREATE OR REPLACE FUNCTION public.can_view_scheduled_test(test_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- User can view if they created the test
    SELECT 1 FROM scheduled_tests 
    WHERE id = test_id AND creator_id = user_id
  ) OR EXISTS (
    -- User can view if test is assigned to all
    SELECT 1 FROM scheduled_tests 
    WHERE id = test_id AND assign_to_all = true
  ) OR EXISTS (
    -- User can view if specifically assigned to them
    SELECT 1 FROM test_assignments ta
    JOIN scheduled_tests st ON st.id = ta.scheduled_test_id
    WHERE st.id = test_id AND ta.assigned_to_user_id = user_id
  );
$$;