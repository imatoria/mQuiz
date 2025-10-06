-- Add RLS policies for viewing violations
CREATE POLICY "Parents can view violations for their children's attempts"
ON paper_violations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM paper_attempts pa
    JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
    WHERE pa.id = paper_violations.paper_attempt_id
    AND pcr.parent_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all violations"
ON paper_violations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_approved = true
  )
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_paper_violations_attempt_id 
ON paper_violations(paper_attempt_id);

CREATE INDEX IF NOT EXISTS idx_paper_violations_severity 
ON paper_violations(severity);

CREATE INDEX IF NOT EXISTS idx_paper_violations_occurred_at 
ON paper_violations(occurred_at DESC);