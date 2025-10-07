-- Allow parents to update their children's approval status
CREATE POLICY "Parents can update their children approval status"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM parent_child_relationships
    WHERE parent_child_relationships.parent_id = auth.uid()
    AND parent_child_relationships.child_id = profiles.user_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM parent_child_relationships
    WHERE parent_child_relationships.parent_id = auth.uid()
    AND parent_child_relationships.child_id = profiles.user_id
  )
);