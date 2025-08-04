-- Create a trigger function to automatically create profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, full_name, role, is_approved)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'parent'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::text, 'parent') = 'admin' THEN false 
      ELSE true 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a profile for the existing user who is stuck
INSERT INTO public.profiles (id, user_id, email, full_name, role, is_approved)
SELECT 
  gen_random_uuid(),
  '4c41ae04-14ba-40e6-8b97-fce8e4045790',
  'praveen.matoria@gmail.com',
  'Praveen Matoria',
  'parent',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = '4c41ae04-14ba-40e6-8b97-fce8e4045790'
);