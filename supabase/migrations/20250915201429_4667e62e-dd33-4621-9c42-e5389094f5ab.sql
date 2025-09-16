-- Create a security definer function to check paper ownership without recursion
CREATE OR REPLACE FUNCTION public.user_owns_paper(paper_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM question_papers 
    WHERE id = paper_id_param 
    AND user_id = auth.uid()
  );
$$;

-- Drop the problematic policy that references question_papers in SELECT
DROP POLICY IF EXISTS "Users can view their own question papers and assigned papers" ON public.question_papers;

-- Create new SELECT policy without recursive reference
CREATE POLICY "Users can view question papers" 
ON public.question_papers 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  assign_to_all = true OR 
  EXISTS (
    SELECT 1 FROM paper_assignments pa 
    WHERE pa.paper_id = question_papers.id 
    AND pa.assigned_to_user_id = auth.uid()
  )
);

-- Now recreate paper_assignments policies using the function
DROP POLICY IF EXISTS "Creators can manage paper assignments" ON public.paper_assignments;

CREATE POLICY "Paper creators can manage assignments" 
ON public.paper_assignments 
FOR ALL 
USING (public.user_owns_paper(paper_id))
WITH CHECK (public.user_owns_paper(paper_id));

CREATE POLICY "Users can view their assignments" 
ON public.paper_assignments 
FOR SELECT 
USING (auth.uid() = assigned_to_user_id);