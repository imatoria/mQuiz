-- Phase 2: Database Functions & RLS Migration (Fixed)
-- Update all database functions to work with unified paper architecture

-- Drop existing functions completely first
DROP FUNCTION IF EXISTS public.detect_multiple_sessions(uuid);
DROP FUNCTION IF EXISTS public.cleanup_old_test_sessions();
DROP FUNCTION IF EXISTS public.create_scheduled_test(uuid, text, timestamp with time zone, timestamp with time zone, integer, boolean);
DROP FUNCTION IF EXISTS public.can_attempt_test(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_scheduled_test(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_active_test_attempt(uuid, uuid);
DROP FUNCTION IF EXISTS public.log_test_violation(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.update_test_attempt_activity();

-- Create new unified paper functions
CREATE OR REPLACE FUNCTION public.schedule_paper(
  p_paper_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_max_attempts integer DEFAULT 1,
  p_assign_to_all boolean DEFAULT true,
  p_time_limit_hours integer DEFAULT NULL,
  p_time_limit_minutes integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
  user_approved boolean;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user role and approval status
  SELECT role, is_approved INTO user_role, user_approved
  FROM profiles 
  WHERE user_id = auth.uid();

  -- Check if user has permission to schedule papers
  IF user_role NOT IN ('parent', 'admin') OR NOT user_approved THEN
    RAISE EXCEPTION 'User not allowed to schedule papers';
  END IF;

  -- Verify the paper belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM question_papers 
    WHERE id = p_paper_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Paper not found or access denied';
  END IF;

  -- Update the paper with scheduling information
  UPDATE question_papers SET
    start_time = p_start_time,
    end_time = p_end_time,
    max_attempts = p_max_attempts,
    assign_to_all = p_assign_to_all,
    is_scheduled = true,
    time_limit_hours = p_time_limit_hours,
    time_limit_minutes = p_time_limit_minutes,
    updated_at = now()
  WHERE id = p_paper_id AND user_id = auth.uid();

  RETURN p_paper_id;
END;
$function$;

-- Function to check if user can attempt a paper
CREATE OR REPLACE FUNCTION public.can_attempt_paper(paper_id_param uuid, user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  paper_record question_papers%ROWTYPE;
  attempts_count INTEGER;
  active_attempt_exists BOOLEAN;
  current_time TIMESTAMPTZ := now();
  time_until_start BIGINT;
  time_until_end BIGINT;
  can_access BOOLEAN := false;
  access_reason TEXT;
BEGIN
  -- Get paper details
  SELECT * INTO paper_record
  FROM question_papers 
  WHERE id = paper_id_param AND is_scheduled = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'canAttempt', false,
      'reason', 'PAPER_NOT_FOUND_OR_NOT_SCHEDULED',
      'currentServerTime', current_time
    );
  END IF;
  
  -- Check if user can view this paper
  IF NOT can_view_scheduled_paper(paper_id_param, user_id_param) THEN
    RETURN jsonb_build_object(
      'canAttempt', false,
      'reason', 'NOT_ASSIGNED',
      'currentServerTime', current_time
    );
  END IF;
  
  -- Count completed attempts
  SELECT COUNT(*) INTO attempts_count
  FROM paper_attempts
  WHERE paper_id = paper_id_param 
    AND user_id = user_id_param 
    AND completed_at IS NOT NULL;
  
  -- Check for active (incomplete) attempts
  SELECT EXISTS(
    SELECT 1 FROM paper_attempts
    WHERE paper_id = paper_id_param 
      AND user_id = user_id_param 
      AND completed_at IS NULL
  ) INTO active_attempt_exists;
  
  -- Calculate time differences
  time_until_start := CASE 
    WHEN paper_record.start_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (paper_record.start_time - current_time)) * 1000
    ELSE NULL 
  END;
  
  time_until_end := CASE 
    WHEN paper_record.end_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (paper_record.end_time - current_time)) * 1000
    ELSE NULL 
  END;
  
  -- Determine access status
  IF paper_record.start_time IS NOT NULL AND current_time < paper_record.start_time THEN
    access_reason := 'NOT_STARTED';
  ELSIF paper_record.end_time IS NOT NULL AND current_time > paper_record.end_time THEN
    access_reason := 'EXPIRED';
  ELSIF attempts_count >= paper_record.max_attempts THEN
    access_reason := 'MAX_ATTEMPTS_REACHED';
  ELSIF active_attempt_exists THEN
    access_reason := 'ACTIVE_ATTEMPT_EXISTS';
    can_access := true;
  ELSE
    access_reason := 'AVAILABLE';
    can_access := true;
  END IF;
  
  RETURN jsonb_build_object(
    'canAttempt', can_access,
    'reason', access_reason,
    'timeUntilStart', time_until_start,
    'timeUntilEnd', time_until_end,
    'attemptsUsed', attempts_count,
    'maxAttempts', paper_record.max_attempts,
    'currentServerTime', current_time,
    'hasActiveAttempt', active_attempt_exists,
    'paperDetails', jsonb_build_object(
      'title', paper_record.title,
      'startTime', paper_record.start_time,
      'endTime', paper_record.end_time
    )
  );
END;
$function$;

-- Function to check if user can view a scheduled paper
CREATE OR REPLACE FUNCTION public.can_view_scheduled_paper(paper_id uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is the creator
  IF EXISTS (
    SELECT 1 FROM question_papers 
    WHERE id = paper_id AND user_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if paper is assigned to all
  IF EXISTS (
    SELECT 1 FROM question_papers 
    WHERE id = paper_id AND assign_to_all = true AND is_scheduled = true
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is specifically assigned to the paper
  IF EXISTS (
    SELECT 1 FROM paper_assignments 
    WHERE paper_id = paper_id AND assigned_to_user_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

-- Function to get active paper attempt
CREATE OR REPLACE FUNCTION public.get_active_paper_attempt(paper_id_param uuid, user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attempt_record paper_attempts%ROWTYPE;
BEGIN
  SELECT * INTO attempt_record
  FROM paper_attempts
  WHERE paper_id = paper_id_param 
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
$function$;

-- Function to log paper violations
CREATE OR REPLACE FUNCTION public.log_paper_violation(
  paper_attempt_id_param uuid, 
  violation_type_param text, 
  details_param jsonb DEFAULT '{}'::jsonb, 
  severity_param text DEFAULT 'medium'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  violation_id UUID;
BEGIN
  INSERT INTO paper_violations (
    paper_attempt_id,
    violation_type,
    details,
    severity
  ) VALUES (
    paper_attempt_id_param,
    violation_type_param,
    details_param,
    severity_param
  ) RETURNING id INTO violation_id;
  
  RETURN violation_id;
END;
$function$;

-- New detect_multiple_sessions function for paper attempts
CREATE OR REPLACE FUNCTION public.detect_multiple_sessions(paper_attempt_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  FROM paper_sessions 
  WHERE paper_attempt_id = paper_attempt_id_param 
    AND is_active = true 
    AND last_ping > now() - INTERVAL '5 minutes';
  
  RETURN jsonb_build_object(
    'count', session_count,
    'has_multiple', session_count > 1,
    'sessions', sessions_data
  );
END;
$function$;

-- New cleanup function for paper sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_paper_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM paper_sessions 
  WHERE last_ping < now() - INTERVAL '24 hours' 
    AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- New paper attempt activity trigger function
CREATE OR REPLACE FUNCTION public.update_paper_attempt_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$function$;

-- Update RLS policies for question_papers to include scheduling functionality
DROP POLICY IF EXISTS "Users can view their own question papers" ON question_papers;
CREATE POLICY "Users can view their own question papers" ON question_papers
FOR SELECT USING (auth.uid() = user_id);

-- Allow students to view scheduled papers assigned to them
CREATE POLICY "Users can view scheduled papers assigned to them" ON question_papers
FOR SELECT USING (
  is_scheduled = true AND (
    assign_to_all = true OR 
    EXISTS (
      SELECT 1 FROM paper_assignments 
      WHERE paper_id = question_papers.id AND assigned_to_user_id = auth.uid()
    )
  )
);

-- Update triggers for new table structure
DROP TRIGGER IF EXISTS update_test_attempt_activity ON test_attempts;
DROP TRIGGER IF EXISTS update_paper_attempt_activity ON paper_attempts;

-- Create trigger for paper attempt activity updates
CREATE TRIGGER update_paper_attempt_activity
  BEFORE UPDATE ON paper_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_paper_attempt_activity();

-- Update audit triggers for paper-related tables
DROP TRIGGER IF EXISTS audit_paper_attempts_trigger ON paper_attempts;
CREATE TRIGGER audit_paper_attempts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON paper_attempts
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_paper_assignments_trigger ON paper_assignments;
CREATE TRIGGER audit_paper_assignments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON paper_assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_question_papers_scheduled ON question_papers(is_scheduled) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_question_papers_start_time ON question_papers(start_time) WHERE start_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_papers_end_time ON question_papers(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paper_attempts_paper_user ON paper_attempts(paper_id, user_id);
CREATE INDEX IF NOT EXISTS idx_paper_attempts_completed ON paper_attempts(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paper_sessions_attempt_active ON paper_sessions(paper_attempt_id, is_active);
CREATE INDEX IF NOT EXISTS idx_paper_violations_attempt ON paper_violations(paper_attempt_id);
CREATE INDEX IF NOT EXISTS idx_paper_assignments_paper ON paper_assignments(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_assignments_user ON paper_assignments(assigned_to_user_id);