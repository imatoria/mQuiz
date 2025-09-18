-- Drop unused tables that have no actual usage in the application

-- Drop backup_schedules table
DROP TABLE IF EXISTS public.backup_schedules CASCADE;

-- Drop data_encryption_keys table  
DROP TABLE IF EXISTS public.data_encryption_keys CASCADE;

-- Drop privacy_settings table
DROP TABLE IF EXISTS public.privacy_settings CASCADE;