-- Add time limit fields to scheduled_tests table without constraint first
ALTER TABLE public.scheduled_tests 
ADD COLUMN IF NOT EXISTS time_limit_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 0;