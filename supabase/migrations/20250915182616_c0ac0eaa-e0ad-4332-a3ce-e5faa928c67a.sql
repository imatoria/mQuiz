-- Remove is_scheduled and time_limit_hours columns from question_papers table
ALTER TABLE question_papers 
DROP COLUMN IF EXISTS is_scheduled,
DROP COLUMN IF EXISTS time_limit_hours;