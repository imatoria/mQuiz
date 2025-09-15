-- Add RLS policy to allow parents to update their children's test attempts
CREATE POLICY "Parents can update their children test attempts" 
ON public.test_attempts 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM parent_child_relationships
  WHERE ((parent_child_relationships.parent_id = auth.uid()) 
    AND (parent_child_relationships.child_id = test_attempts.user_id))
));