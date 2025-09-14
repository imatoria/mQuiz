-- Add show_results column to scheduled_tests table
ALTER TABLE scheduled_tests 
ADD COLUMN show_results boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN scheduled_tests.show_results IS 'If true, students can see results immediately. If false, requires manual approval from parent.';