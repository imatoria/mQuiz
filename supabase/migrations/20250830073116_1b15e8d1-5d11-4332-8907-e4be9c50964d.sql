-- Add time limit fields to scheduled_tests table
ALTER TABLE public.scheduled_tests 
ADD COLUMN time_limit_hours INTEGER DEFAULT 0,
ADD COLUMN time_limit_minutes INTEGER DEFAULT 0;

-- Add a constraint to ensure at least one time limit field is set
ALTER TABLE public.scheduled_tests 
ADD CONSTRAINT check_time_limit CHECK (time_limit_hours > 0 OR time_limit_minutes > 0);