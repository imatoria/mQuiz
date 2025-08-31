-- Phase 7: Database Schema Enhancements

-- 7.1 Add missing columns to test_attempts table
ALTER TABLE public.test_attempts 
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_remaining INTEGER;

-- Add constraint to ensure progress_percentage is between 0 and 100
ALTER TABLE public.test_attempts 
ADD CONSTRAINT progress_percentage_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- 7.2 Create test_sessions table to track active test sessions
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on test_sessions
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- 7.3 Create test_violations table to log suspicious activities
CREATE TABLE IF NOT EXISTS public.test_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low',
  auto_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on test_violations
ALTER TABLE public.test_violations ENABLE ROW LEVEL SECURITY;

-- 7.4 Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_sessions_attempt_id ON public.test_sessions(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_active ON public.test_sessions(is_active, last_ping);
CREATE INDEX IF NOT EXISTS idx_test_violations_attempt_id ON public.test_violations(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_violations_type ON public.test_violations(violation_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_test_attempts_activity ON public.test_attempts(last_activity_at);

-- 7.5 Create function to update last_activity_at automatically
CREATE OR REPLACE FUNCTION public.update_test_attempt_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic activity updates
DROP TRIGGER IF EXISTS update_test_attempt_activity_trigger ON public.test_attempts;
CREATE TRIGGER update_test_attempt_activity_trigger
  BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_test_attempt_activity();

-- 7.6 Create function to get active test attempt for user
CREATE OR REPLACE FUNCTION public.get_active_test_attempt(test_id_param UUID, user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  attempt_record test_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt_record
  FROM test_attempts
  WHERE scheduled_test_id = test_id_param 
    AND user_id = user_id_param 
    AND completed_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    RETURN to_jsonb(attempt_record);
  ELSE
    RETURN null;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.7 RLS Policies for test_sessions
CREATE POLICY "Users can view their own test sessions" ON public.test_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts 
      WHERE test_attempts.id = test_sessions.test_attempt_id 
        AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own test sessions" ON public.test_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_attempts 
      WHERE test_attempts.id = test_sessions.test_attempt_id 
        AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own test sessions" ON public.test_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts 
      WHERE test_attempts.id = test_sessions.test_attempt_id 
        AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage all test sessions" ON public.test_sessions
  FOR ALL USING (true);

-- 7.8 RLS Policies for test_violations
CREATE POLICY "Users can view their own test violations" ON public.test_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts 
      WHERE test_attempts.id = test_violations.test_attempt_id 
        AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create test violations" ON public.test_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all test violations" ON public.test_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'admin' 
        AND profiles.is_approved = true
    )
  );

-- 7.9 Create function to clean up old test sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_test_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions older than 24 hours that are inactive
  DELETE FROM public.test_sessions 
  WHERE last_ping < now() - INTERVAL '24 hours' 
    AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.10 Create function to detect multiple active sessions
CREATE OR REPLACE FUNCTION public.detect_multiple_sessions(test_attempt_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  session_count INTEGER;
  sessions_data JSONB;
BEGIN
  SELECT COUNT(*), jsonb_agg(
    jsonb_build_object(
      'id', id,
      'last_ping', last_ping,
      'ip_address', ip_address,
      'user_agent', user_agent
    )
  )
  INTO session_count, sessions_data
  FROM public.test_sessions 
  WHERE test_attempt_id = test_attempt_id_param 
    AND is_active = true 
    AND last_ping > now() - INTERVAL '5 minutes';
  
  RETURN jsonb_build_object(
    'count', session_count,
    'has_multiple', session_count > 1,
    'sessions', sessions_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.11 Add updated_at trigger for new tables
CREATE TRIGGER update_test_sessions_updated_at
  BEFORE UPDATE ON public.test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7.12 Create function to log test violations
CREATE OR REPLACE FUNCTION public.log_test_violation(
  test_attempt_id_param UUID,
  violation_type_param TEXT,
  details_param JSONB DEFAULT '{}',
  severity_param TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
  violation_id UUID;
BEGIN
  INSERT INTO public.test_violations (
    test_attempt_id,
    violation_type,
    details,
    severity
  ) VALUES (
    test_attempt_id_param,
    violation_type_param,
    details_param,
    severity_param
  ) RETURNING id INTO violation_id;
  
  RETURN violation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;