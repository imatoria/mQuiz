-- Fix security warnings: Add search_path to functions

-- Fix update_test_attempt_activity function
CREATE OR REPLACE FUNCTION public.update_test_attempt_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

-- Fix get_active_test_attempt function
CREATE OR REPLACE FUNCTION public.get_active_test_attempt(test_id_param UUID, user_id_param UUID)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix cleanup_old_test_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_old_test_sessions()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions older than 24 hours that are inactive
  DELETE FROM test_sessions 
  WHERE last_ping < now() - INTERVAL '24 hours' 
    AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Fix detect_multiple_sessions function
CREATE OR REPLACE FUNCTION public.detect_multiple_sessions(test_attempt_id_param UUID)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM test_sessions 
  WHERE test_attempt_id = test_attempt_id_param 
    AND is_active = true 
    AND last_ping > now() - INTERVAL '5 minutes';
  
  RETURN jsonb_build_object(
    'count', session_count,
    'has_multiple', session_count > 1,
    'sessions', sessions_data
  );
END;
$$;

-- Fix log_test_violation function
CREATE OR REPLACE FUNCTION public.log_test_violation(
  test_attempt_id_param UUID,
  violation_type_param TEXT,
  details_param JSONB DEFAULT '{}',
  severity_param TEXT DEFAULT 'medium'
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  violation_id UUID;
BEGIN
  INSERT INTO test_violations (
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
$$;