
-- Create table for user custom subjects
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subjects
CREATE POLICY "Users can manage their own subjects" ON public.user_subjects
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
