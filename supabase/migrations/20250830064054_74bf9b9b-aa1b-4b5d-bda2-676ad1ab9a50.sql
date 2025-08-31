-- Fix remaining recursive policies in scheduled_tests

-- Drop policies that use functions which may cause recursion
DROP POLICY IF EXISTS "Users can delete their own scheduled tests" ON public.scheduled_tests;
DROP POLICY IF EXISTS "Users can update their own scheduled tests" ON public.scheduled_tests;

-- Create simple, non-recursive policies
CREATE POLICY "Users can delete their own created tests" 
ON public.scheduled_tests 
FOR DELETE 
USING (creator_id = auth.uid());

CREATE POLICY "Users can update their own created tests" 
ON public.scheduled_tests 
FOR UPDATE 
USING (creator_id = auth.uid());