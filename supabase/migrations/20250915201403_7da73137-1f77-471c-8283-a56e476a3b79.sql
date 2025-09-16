-- Break RLS recursion between question_papers and paper_assignments
-- 1) Drop broad ALL policy on paper_assignments
DROP POLICY IF EXISTS "Creators can manage paper assignments" ON public.paper_assignments;

-- 2) Re-create granular policies without SELECT
CREATE POLICY "Creators can insert paper assignments"
ON public.paper_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.question_papers qp
    WHERE qp.id = paper_assignments.paper_id
      AND qp.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can update paper assignments"
ON public.paper_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.question_papers qp
    WHERE qp.id = paper_assignments.paper_id
      AND qp.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can delete paper assignments"
ON public.paper_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.question_papers qp
    WHERE qp.id = paper_assignments.paper_id
      AND qp.user_id = auth.uid()
  )
);

-- Keep existing SELECT policy that doesn't reference question_papers
-- ("Users can view their assigned papers") remains unchanged; no action needed.
