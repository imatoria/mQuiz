-- Check if we need to create an INSERT policy for scheduled_tests
CREATE POLICY "Users can create their own scheduled tests" 
ON public.scheduled_tests 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);