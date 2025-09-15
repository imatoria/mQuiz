-- Phase 1: Complete Database Schema Migration - Merge Tests into Papers

-- 1.1 Extend question_papers table with scheduling fields
ALTER TABLE question_papers 
ADD COLUMN start_time timestamp with time zone,
ADD COLUMN end_time timestamp with time zone,
ADD COLUMN max_attempts integer DEFAULT 1,
ADD COLUMN assign_to_all boolean DEFAULT true,
ADD COLUMN show_results boolean DEFAULT false,
ADD COLUMN is_scheduled boolean DEFAULT false,
ADD COLUMN time_limit_hours integer,
ADD COLUMN time_limit_minutes integer;

-- 1.2 Create paper_assignments table (replaces test_assignments)
CREATE TABLE paper_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  assigned_to_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 1.3 Create paper_attempts table (replaces test_attempts)
CREATE TABLE paper_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  score integer,
  total_questions integer,
  answers jsonb,
  feedback text,
  show_results boolean DEFAULT false,
  time_remaining integer,
  progress_percentage integer DEFAULT 0,
  is_paused boolean DEFAULT false,
  last_activity_at timestamp with time zone DEFAULT now(),
  current_question_index integer DEFAULT 0,
  attempt_number integer DEFAULT 1
);

-- 1.4 Create paper_sessions table (replaces test_sessions)
CREATE TABLE paper_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_attempt_id uuid NOT NULL REFERENCES paper_attempts(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  started_at timestamp with time zone DEFAULT now(),
  last_ping timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 1.5 Create paper_violations table (replaces test_violations)
CREATE TABLE paper_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_attempt_id uuid NOT NULL REFERENCES paper_attempts(id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  severity text DEFAULT 'low',
  details jsonb DEFAULT '{}',
  occurred_at timestamp with time zone DEFAULT now(),
  auto_resolved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE paper_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paper_assignments
CREATE POLICY "Users can view their assigned papers" ON paper_assignments
  FOR SELECT USING (auth.uid() = assigned_to_user_id);

CREATE POLICY "Creators can manage paper assignments" ON paper_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM question_papers 
      WHERE question_papers.id = paper_assignments.paper_id 
      AND question_papers.user_id = auth.uid()
    )
  );

-- Create RLS policies for paper_attempts
CREATE POLICY "Users can view their own paper attempts" ON paper_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own paper attempts" ON paper_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paper attempts" ON paper_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children paper attempts" ON paper_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.parent_id = auth.uid()
      AND parent_child_relationships.child_id = paper_attempts.user_id
    )
  );

CREATE POLICY "Parents can update results for their children attempts" ON paper_attempts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships pc
      JOIN question_papers qp ON qp.id = paper_attempts.paper_id
      WHERE pc.parent_id = auth.uid()
      AND pc.child_id = paper_attempts.user_id
      AND qp.user_id = auth.uid()
    )
  );

-- Create RLS policies for paper_sessions
CREATE POLICY "Users can view their own paper sessions" ON paper_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM paper_attempts
      WHERE paper_attempts.id = paper_sessions.paper_attempt_id
      AND paper_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own paper sessions" ON paper_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM paper_attempts
      WHERE paper_attempts.id = paper_sessions.paper_attempt_id
      AND paper_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own paper sessions" ON paper_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM paper_attempts
      WHERE paper_attempts.id = paper_sessions.paper_attempt_id
      AND paper_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage all paper sessions" ON paper_sessions
  FOR ALL USING (true);

-- Create RLS policies for paper_violations
CREATE POLICY "Users can view their own paper violations" ON paper_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM paper_attempts
      WHERE paper_attempts.id = paper_violations.paper_attempt_id
      AND paper_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create paper violations" ON paper_violations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all paper violations" ON paper_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_approved = true
    )
  );

-- Create triggers for updated_at columns
CREATE TRIGGER update_paper_sessions_updated_at
  BEFORE UPDATE ON paper_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_attempts_activity
  BEFORE UPDATE ON paper_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_test_attempt_activity();

-- Create indexes for performance
CREATE INDEX idx_paper_attempts_paper_id ON paper_attempts(paper_id);
CREATE INDEX idx_paper_attempts_user_id ON paper_attempts(user_id);
CREATE INDEX idx_paper_assignments_paper_id ON paper_assignments(paper_id);
CREATE INDEX idx_paper_assignments_user_id ON paper_assignments(assigned_to_user_id);
CREATE INDEX idx_paper_sessions_attempt_id ON paper_sessions(paper_attempt_id);
CREATE INDEX idx_paper_violations_attempt_id ON paper_violations(paper_attempt_id);
CREATE INDEX idx_question_papers_scheduled ON question_papers(is_scheduled) WHERE is_scheduled = true;

-- Migrate existing data from scheduled_tests to question_papers
UPDATE question_papers 
SET 
  start_time = st.start_time,
  end_time = st.end_time,
  max_attempts = st.max_attempts,
  assign_to_all = st.assign_to_all,
  show_results = st.show_results,
  is_scheduled = true,
  time_limit_hours = st.time_limit_hours,
  time_limit_minutes = st.time_limit_minutes
FROM scheduled_tests st
WHERE question_papers.id = st.question_paper_id;

-- Migrate test_assignments to paper_assignments
INSERT INTO paper_assignments (paper_id, assigned_to_user_id, created_at)
SELECT 
  st.question_paper_id,
  ta.assigned_to_user_id,
  ta.created_at
FROM test_assignments ta
JOIN scheduled_tests st ON st.id = ta.scheduled_test_id;

-- Migrate test_attempts to paper_attempts
INSERT INTO paper_attempts (
  paper_id, user_id, started_at, completed_at, score, total_questions,
  answers, feedback, show_results, time_remaining, progress_percentage,
  is_paused, last_activity_at, current_question_index, attempt_number
)
SELECT 
  st.question_paper_id,
  ta.user_id,
  ta.started_at,
  ta.completed_at,
  ta.score,
  ta.total_questions,
  ta.answers,
  ta.feedback,
  ta.show_results,
  ta.time_remaining,
  ta.progress_percentage,
  ta.is_paused,
  ta.last_activity_at,
  ta.current_question_index,
  ta.attempt_number
FROM test_attempts ta
JOIN scheduled_tests st ON st.id = ta.scheduled_test_id;

-- Migrate test_sessions to paper_sessions
INSERT INTO paper_sessions (
  paper_attempt_id, ip_address, user_agent, started_at, 
  last_ping, is_active, created_at, updated_at
)
SELECT 
  pa.id,
  ts.ip_address,
  ts.user_agent,
  ts.started_at,
  ts.last_ping,
  ts.is_active,
  ts.created_at,
  ts.updated_at
FROM test_sessions ts
JOIN test_attempts ta ON ta.id = ts.test_attempt_id
JOIN scheduled_tests st ON st.id = ta.scheduled_test_id
JOIN paper_attempts pa ON pa.paper_id = st.question_paper_id AND pa.user_id = ta.user_id;

-- Migrate test_violations to paper_violations
INSERT INTO paper_violations (
  paper_attempt_id, violation_type, severity, details,
  occurred_at, auto_resolved, created_at
)
SELECT 
  pa.id,
  tv.violation_type,
  tv.severity,
  tv.details,
  tv.occurred_at,
  tv.auto_resolved,
  tv.created_at
FROM test_violations tv
JOIN test_attempts ta ON ta.id = tv.test_attempt_id
JOIN scheduled_tests st ON st.id = ta.scheduled_test_id
JOIN paper_attempts pa ON pa.paper_id = st.question_paper_id AND pa.user_id = ta.user_id;

-- Drop old tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS test_violations CASCADE;
DROP TABLE IF EXISTS test_sessions CASCADE;
DROP TABLE IF EXISTS test_assignments CASCADE;
DROP TABLE IF EXISTS test_attempts CASCADE;
DROP TABLE IF EXISTS scheduled_tests CASCADE;