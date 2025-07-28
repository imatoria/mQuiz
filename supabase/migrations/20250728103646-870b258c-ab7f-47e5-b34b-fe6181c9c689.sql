-- Enable RLS on subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for subjects (allow all users to read subjects)
CREATE POLICY "Everyone can view subjects" ON public.subjects FOR SELECT USING (true);

-- Fix the update_updated_at_column function with security definer and proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;