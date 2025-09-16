-- Create RPC function for soft delete of question papers
CREATE OR REPLACE FUNCTION public.soft_delete_paper(paper_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the paper
  IF NOT EXISTS (
    SELECT 1 FROM question_papers 
    WHERE id = paper_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Paper not found or access denied';
  END IF;

  -- Soft delete the paper
  UPDATE question_papers 
  SET is_deleted = true, deleted_at = now() 
  WHERE id = paper_id AND user_id = auth.uid();
END;
$$;