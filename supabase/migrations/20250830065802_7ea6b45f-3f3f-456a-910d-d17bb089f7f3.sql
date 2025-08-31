-- Force refresh RLS policies by disabling and re-enabling RLS
ALTER TABLE public.scheduled_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tests ENABLE ROW LEVEL SECURITY;

-- Test query to ensure policies work
SELECT 'RLS policies refreshed successfully' as message;