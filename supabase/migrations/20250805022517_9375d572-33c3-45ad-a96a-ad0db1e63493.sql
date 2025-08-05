-- Add missing approval fields to test_attempts table
ALTER TABLE public.test_attempts 
ADD COLUMN approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN approved_by uuid,
ADD COLUMN feedback text;

-- Create audit_logs table for security tracking
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit_logs (only admins can view, system can insert)
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true
));

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create data_encryption_keys table for managing encryption
CREATE TABLE public.data_encryption_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name text NOT NULL UNIQUE,
  key_version integer NOT NULL DEFAULT 1,
  encrypted_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Enable RLS on data_encryption_keys
ALTER TABLE public.data_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage encryption keys
CREATE POLICY "Admins can manage encryption keys" 
ON public.data_encryption_keys 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true
));

-- Create backup_schedules table
CREATE TABLE public.backup_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  backup_type text NOT NULL CHECK (backup_type IN ('full', 'incremental')),
  is_active boolean NOT NULL DEFAULT true,
  last_backup_at timestamp with time zone,
  next_backup_at timestamp with time zone,
  retention_days integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on backup_schedules
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage backup schedules
CREATE POLICY "Admins can manage backup schedules" 
ON public.backup_schedules 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin' AND is_approved = true
));

-- Create privacy_settings table for GDPR/COPPA compliance
CREATE TABLE public.privacy_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  data_retention_period integer DEFAULT 365, -- days
  marketing_consent boolean DEFAULT false,
  analytics_consent boolean DEFAULT false,
  third_party_sharing boolean DEFAULT false,
  data_export_requested boolean DEFAULT false,
  data_deletion_requested boolean DEFAULT false,
  coppa_compliant boolean DEFAULT false,
  parental_consent_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on privacy_settings
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own privacy settings
CREATE POLICY "Users can manage their own privacy settings" 
ON public.privacy_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Parents can manage their children's privacy settings
CREATE POLICY "Parents can manage children privacy settings" 
ON public.privacy_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.parent_child_relationships 
  WHERE parent_id = auth.uid() AND child_id = privacy_settings.user_id
));

-- Create rate_limits table for API rate limiting
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  ip_address inet,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Create audit trigger function for logging changes
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_test_attempts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_questions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at trigger to new tables
CREATE TRIGGER update_backup_schedules_updated_at
  BEFORE UPDATE ON public.backup_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();