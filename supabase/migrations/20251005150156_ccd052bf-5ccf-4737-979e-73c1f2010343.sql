-- Create database functions for analytics queries

-- Function to get question-level analytics for a parent's children
CREATE OR REPLACE FUNCTION public.get_question_analytics(
  parent_user_id UUID,
  time_period_days INTEGER DEFAULT 30,
  difficulty_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  subject_name TEXT,
  difficulty TEXT,
  total_attempts BIGINT,
  correct_attempts BIGINT,
  success_rate NUMERIC,
  avg_time_spent INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH question_attempts AS (
    SELECT 
      q.id as q_id,
      q.question_text,
      s.name as subject_name,
      q.difficulty::text,
      pa.answers,
      pa.completed_at,
      pa.started_at
    FROM questions q
    INNER JOIN subjects s ON s.id = q.subject_id
    INNER JOIN question_paper_questions qpq ON qpq.question_id = q.id
    INNER JOIN paper_attempts pa ON pa.paper_id = qpq.question_paper_id
    INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
    WHERE pcr.parent_id = parent_user_id
      AND pa.completed_at IS NOT NULL
      AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
      AND (difficulty_filter = 'all' OR q.difficulty::text = difficulty_filter)
      AND q.is_deleted = false
  )
  SELECT 
    qa.q_id,
    qa.question_text,
    qa.subject_name,
    qa.difficulty,
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (
      WHERE qa.answers IS NOT NULL 
      AND qa.answers->'userAnswers' ? qa.q_id::text
      AND (qa.answers->'userAnswers'->>qa.q_id::text) = (
        SELECT correct_answer::text 
        FROM questions 
        WHERE id = qa.q_id
      )
    )::BIGINT as correct_attempts,
    ROUND(
      (COUNT(*) FILTER (
        WHERE qa.answers IS NOT NULL 
        AND qa.answers->'userAnswers' ? qa.q_id::text
        AND (qa.answers->'userAnswers'->>qa.q_id::text) = (
          SELECT correct_answer::text 
          FROM questions 
          WHERE id = qa.q_id
        )
      )::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 
      1
    ) as success_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (qa.completed_at - qa.started_at)) / NULLIF(qa.answers->>'totalQuestions', '0')::INTEGER))::INTEGER as avg_time_spent
  FROM question_attempts qa
  GROUP BY qa.q_id, qa.question_text, qa.subject_name, qa.difficulty
  HAVING COUNT(*) > 0
  ORDER BY total_attempts DESC;
END;
$$;

-- Function to get paper-level performance analytics
CREATE OR REPLACE FUNCTION public.get_paper_performance(
  parent_user_id UUID,
  time_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  paper_id UUID,
  paper_title TEXT,
  total_attempts BIGINT,
  avg_score NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH paper_stats AS (
    SELECT 
      qp.id,
      qp.title,
      pa.completed_at,
      pa.score,
      pa.started_at
    FROM question_papers qp
    INNER JOIN paper_attempts pa ON pa.paper_id = qp.id
    INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
    WHERE pcr.parent_id = parent_user_id
      AND pa.started_at >= NOW() - (time_period_days || ' days')::INTERVAL
      AND qp.is_deleted = false
  )
  SELECT 
    ps.id,
    ps.title,
    COUNT(*)::BIGINT as total_attempts,
    ROUND(AVG(ps.score)::NUMERIC, 1) as avg_score,
    ROUND((COUNT(*) FILTER (WHERE ps.completed_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 1) as completion_rate
  FROM paper_stats ps
  GROUP BY ps.id, ps.title
  HAVING COUNT(*) > 0
  ORDER BY total_attempts DESC;
END;
$$;

-- Function to get overall statistics
CREATE OR REPLACE FUNCTION public.get_overall_analytics(
  parent_user_id UUID,
  time_period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_questions_used BIGINT,
  total_attempts BIGINT,
  avg_success_rate NUMERIC,
  active_students BIGINT,
  avg_completion_time INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT q.id)
     FROM questions q
     INNER JOIN question_paper_questions qpq ON qpq.question_id = q.id
     INNER JOIN paper_attempts pa ON pa.paper_id = qpq.question_paper_id
     INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
     WHERE pcr.parent_id = parent_user_id
       AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
       AND pa.completed_at IS NOT NULL
       AND q.is_deleted = false
    )::BIGINT as total_questions_used,
    
    (SELECT COUNT(*)
     FROM paper_attempts pa
     INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
     WHERE pcr.parent_id = parent_user_id
       AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
       AND pa.completed_at IS NOT NULL
    )::BIGINT as total_attempts,
    
    (SELECT ROUND(AVG(pa.score)::NUMERIC, 1)
     FROM paper_attempts pa
     INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
     WHERE pcr.parent_id = parent_user_id
       AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
       AND pa.completed_at IS NOT NULL
       AND pa.score IS NOT NULL
    ) as avg_success_rate,
    
    (SELECT COUNT(DISTINCT pa.user_id)
     FROM paper_attempts pa
     INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
     WHERE pcr.parent_id = parent_user_id
       AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
       AND pa.completed_at IS NOT NULL
    )::BIGINT as active_students,
    
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pa.completed_at - pa.started_at))))::INTEGER
     FROM paper_attempts pa
     INNER JOIN parent_child_relationships pcr ON pcr.child_id = pa.user_id
     WHERE pcr.parent_id = parent_user_id
       AND pa.completed_at >= NOW() - (time_period_days || ' days')::INTERVAL
       AND pa.completed_at IS NOT NULL
    ) as avg_completion_time;
END;
$$;