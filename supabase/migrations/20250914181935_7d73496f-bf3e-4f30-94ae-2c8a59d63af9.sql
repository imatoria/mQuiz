-- Remove approval columns from test_attempts table
ALTER TABLE test_attempts 
DROP COLUMN approval_status,
DROP COLUMN approved_at,
DROP COLUMN approved_by;

-- Add show_results column to test_attempts table
ALTER TABLE test_attempts 
ADD COLUMN show_results BOOLEAN NOT NULL DEFAULT false;