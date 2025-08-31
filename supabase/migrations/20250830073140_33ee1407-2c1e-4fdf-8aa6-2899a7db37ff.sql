-- Add time limit fields to scheduled_tests table
ALTER TABLE public.scheduled_tests 
ADD COLUMN time_limit_hours INTEGER DEFAULT 0,
ADD COLUMN time_limit_minutes INTEGER DEFAULT 0;

-- Update existing records to have valid time limits based on their question papers
UPDATE public.scheduled_tests 
SET time_limit_minutes = COALESCE(
  (SELECT qp.time_limit_minutes 
   FROM question_papers qp 
   WHERE qp.id = scheduled_tests.question_paper_id), 
  60
)
WHERE time_limit_minutes = 0 AND time_limit_hours = 0;

-- Add a constraint to ensure at least one time limit field is set (for future records)
ALTER TABLE public.scheduled_tests 
ADD CONSTRAINT check_time_limit CHECK (time_limit_hours > 0 OR time_limit_minutes > 0);