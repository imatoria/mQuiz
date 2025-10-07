-- Step 2.1: Update Database Functions

-- Update get_question_analytics() to use subjects_parent instead of subjects
CREATE OR REPLACE FUNCTION public.get_question_analytics(parent_user_id uuid, time_period_days integer DEFAULT 30, difficulty_filter text DEFAULT 'all'::text)
 RETURNS TABLE(question_id uuid, question_text text, subject_name text, difficulty text, total_attempts bigint, correct_attempts bigint, success_rate numeric, avg_time_spent integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH question_attempts AS (
    SELECT 
      q.id as q_id,
      q.question_text,
      sp.subject_name,
      q.difficulty::text,
      pa.answers,
      pa.completed_at,
      pa.started_at
    FROM questions q
    INNER JOIN subjects_parent sp ON sp.id = q.subject_parent_id
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
$function$;

-- Update seed_default_subjects_parent() to use hardcoded list instead of subjects table
CREATE OR REPLACE FUNCTION public.seed_default_subjects_parent(p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subjects_parent (parent_id, subject_name, subject_key)
  VALUES
    (p_parent_id, 'Mathematics', 'mathematics'),
    (p_parent_id, 'English', 'english'),
    (p_parent_id, 'Science', 'science'),
    (p_parent_id, 'History', 'history'),
    (p_parent_id, 'Geography', 'geography'),
    (p_parent_id, 'Physics', 'physics'),
    (p_parent_id, 'Chemistry', 'chemistry'),
    (p_parent_id, 'Biology', 'biology'),
    (p_parent_id, 'Computer Science', 'computer_science'),
    (p_parent_id, 'Physical Education', 'physical_education'),
    (p_parent_id, 'Art', 'art'),
    (p_parent_id, 'Music', 'music')
  ON CONFLICT (parent_id, subject_name) DO NOTHING;
END;
$function$;