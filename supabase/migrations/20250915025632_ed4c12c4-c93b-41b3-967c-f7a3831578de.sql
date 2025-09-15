-- Add RLS policy to allow parents to view their children's test attempts
CREATE POLICY "Parents can view their children test attempts" 
ON test_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM parent_child_relationships 
    WHERE parent_child_relationships.parent_id = auth.uid() 
    AND parent_child_relationships.child_id = test_attempts.user_id
  )
);