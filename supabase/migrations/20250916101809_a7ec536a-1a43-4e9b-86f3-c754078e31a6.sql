-- Fix the can_view_scheduled_paper function to use correct column names
-- Drop and recreate the function with correct logic

DROP FUNCTION IF EXISTS public.can_view_scheduled_paper(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_view_scheduled_paper(paper_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE
      -- Paper creator can always view
      WHEN qp.user_id = user_id THEN true
      -- If assign_to_all is true and paper is scheduled (has start_time and end_time)
      WHEN qp.assign_to_all = true 
           AND qp.start_time IS NOT NULL 
           AND qp.end_time IS NOT NULL 
           AND now() >= qp.start_time 
           AND now() <= qp.end_time THEN true
      -- If specifically assigned to user
      WHEN EXISTS (
        SELECT 1 
        FROM paper_assignments pa 
        WHERE pa.paper_id = paper_id AND pa.assigned_to_user_id = user_id
      ) THEN true
      ELSE false
    END
  FROM question_papers qp
  WHERE qp.id = paper_id;
$$;