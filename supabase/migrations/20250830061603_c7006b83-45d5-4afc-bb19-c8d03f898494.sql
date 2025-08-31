-- Create profiles for existing child users who don't have profiles yet
INSERT INTO public.profiles (user_id, email, full_name, role, is_approved)
SELECT 
  au.id as user_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'child' as role,
  true as is_approved
FROM auth.users au
WHERE au.id IN (
  SELECT DISTINCT child_id 
  FROM public.parent_child_relationships
)
AND au.id NOT IN (
  SELECT user_id 
  FROM public.profiles
);