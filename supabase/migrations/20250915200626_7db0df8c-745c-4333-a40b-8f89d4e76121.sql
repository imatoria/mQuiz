-- Fix infinite recursion in question_papers RLS policies
-- Drop the redundant SELECT policy and keep the more comprehensive one

-- Drop the basic policy that's causing recursion
DROP POLICY IF EXISTS "Users can view their own question papers" ON question_papers;

-- The comprehensive policy "Users can view their own question papers and assigned papers" 
-- already covers all the necessary access patterns, so we keep that one