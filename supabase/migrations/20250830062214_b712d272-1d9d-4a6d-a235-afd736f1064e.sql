-- Add RLS policy to allow parents to view their children's profiles
CREATE POLICY "Parents can view their children profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.parent_child_relationships 
    WHERE parent_child_relationships.parent_id = auth.uid() 
    AND parent_child_relationships.child_id = profiles.user_id
  )
);