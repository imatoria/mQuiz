-- First drop the dependent RLS policy
DROP POLICY IF EXISTS "Users can view scheduled papers assigned to them" ON question_papers;

-- Remove is_scheduled and time_limit_hours columns from question_papers table
ALTER TABLE question_papers 
DROP COLUMN IF EXISTS is_scheduled,
DROP COLUMN IF EXISTS time_limit_hours;

-- Create a simplified policy for viewing question papers
CREATE POLICY "Users can view their own question papers and assigned papers" 
ON question_papers 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (assign_to_all = true) OR 
  (EXISTS (
    SELECT 1 FROM paper_assignments 
    WHERE paper_assignments.paper_id = question_papers.id 
    AND paper_assignments.assigned_to_user_id = auth.uid()
  ))
);