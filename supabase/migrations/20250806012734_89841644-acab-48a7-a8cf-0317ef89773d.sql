-- Create audit trigger for role changes and security events
CREATE OR REPLACE FUNCTION public.audit_role_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only audit role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      auth.uid(),
      'ROLE_CHANGE',
      'profiles',
      NEW.id::text,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_user_id', NEW.user_id,
        'changed_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile role changes
CREATE TRIGGER audit_profile_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_change_trigger();

-- Create function to validate role changes with proper authorization
CREATE OR REPLACE FUNCTION public.validate_role_change(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role TEXT;
  current_user_approved BOOLEAN;
  target_current_role TEXT;
BEGIN
  -- Get current user's role and approval status
  SELECT role, is_approved INTO current_user_role, current_user_approved
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Check if current user is an approved admin
  IF current_user_role != 'admin' OR NOT current_user_approved THEN
    RETURN FALSE;
  END IF;
  
  -- Get target user's current role
  SELECT role INTO target_current_role
  FROM public.profiles 
  WHERE user_id = target_user_id;
  
  -- Prevent creating unlimited admin accounts
  -- Only allow promoting to admin if there are fewer than 3 admins
  IF new_role = 'admin' AND target_current_role != 'admin' THEN
    DECLARE
      admin_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO admin_count
      FROM public.profiles 
      WHERE role = 'admin' AND is_approved = true;
      
      -- Limit to maximum 3 approved admins
      IF admin_count >= 3 THEN
        RETURN FALSE;
      END IF;
    END;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Add validation trigger for role changes
CREATE OR REPLACE FUNCTION public.validate_role_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only validate on role changes
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.validate_role_change(NEW.user_id, NEW.role) THEN
      RAISE EXCEPTION 'Unauthorized role change or admin limit exceeded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the validation trigger
CREATE TRIGGER validate_profile_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change_trigger();

-- Create encryption key management for API keys
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on encryption keys
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage encryption keys
CREATE POLICY "Admins can manage encryption keys"
ON public.encryption_keys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true
  )
);

-- Add rate limiting for critical operations
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security events
CREATE POLICY "Admins can view all security events"
ON public.security_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_approved = true
  )
);

-- System can insert security events
CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);