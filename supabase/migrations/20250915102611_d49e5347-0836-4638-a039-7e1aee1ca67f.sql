-- Phase 1: Complete Database Schema Migration - Merge Tests into Papers (Corrected)

-- Check and add missing columns to question_papers table
DO $$ 
BEGIN 
    -- Add start_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'start_time') THEN
        ALTER TABLE question_papers ADD COLUMN start_time timestamp with time zone;
    END IF;
    
    -- Add end_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'end_time') THEN
        ALTER TABLE question_papers ADD COLUMN end_time timestamp with time zone;
    END IF;
    
    -- Add max_attempts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'max_attempts') THEN
        ALTER TABLE question_papers ADD COLUMN max_attempts integer DEFAULT 1;
    END IF;
    
    -- Add assign_to_all if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'assign_to_all') THEN
        ALTER TABLE question_papers ADD COLUMN assign_to_all boolean DEFAULT true;
    END IF;
    
    -- Add show_results if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'show_results') THEN
        ALTER TABLE question_papers ADD COLUMN show_results boolean DEFAULT false;
    END IF;
    
    -- Add is_scheduled if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'is_scheduled') THEN
        ALTER TABLE question_papers ADD COLUMN is_scheduled boolean DEFAULT false;
    END IF;
    
    -- Add time_limit_hours if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'question_papers' AND column_name = 'time_limit_hours') THEN
        ALTER TABLE question_papers ADD COLUMN time_limit_hours integer;
    END IF;
END $$;

-- Create paper_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS paper_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
  assigned_to_user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create paper_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS paper_attempts (
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

-- Create paper_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS paper_sessions (
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

-- Create paper_violations table if it doesn't exist
CREATE TABLE IF NOT EXISTS paper_violations (
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
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_assignments' AND policyname = 'Users can view their assigned papers') THEN
        CREATE POLICY "Users can view their assigned papers" ON paper_assignments
        FOR SELECT USING (auth.uid() = assigned_to_user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_assignments' AND policyname = 'Creators can manage paper assignments') THEN
        CREATE POLICY "Creators can manage paper assignments" ON paper_assignments
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM question_papers 
                WHERE question_papers.id = paper_assignments.paper_id 
                AND question_papers.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Create RLS policies for paper_attempts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_attempts' AND policyname = 'Users can view their own paper attempts') THEN
        CREATE POLICY "Users can view their own paper attempts" ON paper_attempts
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_attempts' AND policyname = 'Users can create their own paper attempts') THEN
        CREATE POLICY "Users can create their own paper attempts" ON paper_attempts
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_attempts' AND policyname = 'Users can update their own paper attempts') THEN
        CREATE POLICY "Users can update their own paper attempts" ON paper_attempts
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_attempts' AND policyname = 'Parents can view their children paper attempts') THEN
        CREATE POLICY "Parents can view their children paper attempts" ON paper_attempts
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM parent_child_relationships
                WHERE parent_child_relationships.parent_id = auth.uid()
                AND parent_child_relationships.child_id = paper_attempts.user_id
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_attempts' AND policyname = 'Parents can update results for their children attempts') THEN
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
    END IF;
END $$;

-- Create RLS policies for paper_sessions and paper_violations
DO $$ 
BEGIN
    -- Paper sessions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_sessions' AND policyname = 'Users can view their own paper sessions') THEN
        CREATE POLICY "Users can view their own paper sessions" ON paper_sessions
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM paper_attempts
                WHERE paper_attempts.id = paper_sessions.paper_attempt_id
                AND paper_attempts.user_id = auth.uid()
            )
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_sessions' AND policyname = 'System can manage all paper sessions') THEN
        CREATE POLICY "System can manage all paper sessions" ON paper_sessions
        FOR ALL USING (true);
    END IF;
    
    -- Paper violations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paper_violations' AND policyname = 'System can create paper violations') THEN
        CREATE POLICY "System can create paper violations" ON paper_violations
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_paper_attempts_paper_id ON paper_attempts(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_attempts_user_id ON paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_assignments_paper_id ON paper_assignments(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_assignments_user_id ON paper_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_paper_sessions_attempt_id ON paper_sessions(paper_attempt_id);
CREATE INDEX IF NOT EXISTS idx_paper_violations_attempt_id ON paper_violations(paper_attempt_id);
CREATE INDEX IF NOT EXISTS idx_question_papers_scheduled ON question_papers(is_scheduled) WHERE is_scheduled = true;

-- Migrate existing data if scheduled_tests table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduled_tests') THEN
        -- Migrate existing data from scheduled_tests to question_papers
        UPDATE question_papers 
        SET 
            start_time = st.start_time,
            end_time = st.end_time,
            max_attempts = st.max_attempts,
            assign_to_all = st.assign_to_all,
            show_results = st.show_results,
            is_scheduled = true,
            time_limit_hours = st.time_limit_hours
        FROM scheduled_tests st
        WHERE question_papers.id = st.question_paper_id;
        
        -- Migrate test_assignments to paper_assignments
        INSERT INTO paper_assignments (paper_id, assigned_to_user_id, created_at)
        SELECT 
            st.question_paper_id,
            ta.assigned_to_user_id,
            ta.created_at
        FROM test_assignments ta
        JOIN scheduled_tests st ON st.id = ta.scheduled_test_id
        ON CONFLICT DO NOTHING;
        
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
        JOIN scheduled_tests st ON st.id = ta.scheduled_test_id
        ON CONFLICT DO NOTHING;
        
        -- Drop old tables in correct order
        DROP TABLE IF EXISTS test_violations CASCADE;
        DROP TABLE IF EXISTS test_sessions CASCADE; 
        DROP TABLE IF EXISTS test_assignments CASCADE;
        DROP TABLE IF EXISTS test_attempts CASCADE;
        DROP TABLE IF EXISTS scheduled_tests CASCADE;
    END IF;
END $$;