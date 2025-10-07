-- Phase 1: Data Migration & Preparation (Fixed)
-- First, temporarily disable the update trigger that's causing issues

-- Drop the trigger temporarily if it exists
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
DROP TRIGGER IF EXISTS update_question_papers_updated_at ON question_papers;
DROP TRIGGER IF EXISTS update_child_subject_assignments_updated_at ON child_subject_assignments;
DROP TRIGGER IF EXISTS update_child_class_assignments_updated_at ON child_class_assignments;

-- Now run the data migration

-- Migrate documents table: subject_id → subject_parent_id, class_level → class_parent_id
UPDATE documents d
SET subject_parent_id = sp.id
FROM subjects_parent sp, subjects s
WHERE d.subject_id IS NOT NULL 
  AND d.subject_parent_id IS NULL
  AND sp.parent_id = d.user_id
  AND s.id = d.subject_id
  AND sp.subject_key = LOWER(REPLACE(s.name, ' ', '_'));

UPDATE documents d
SET class_parent_id = cp.id
FROM classes_parent cp
WHERE d.class_level IS NOT NULL
  AND d.class_parent_id IS NULL
  AND cp.parent_id = d.user_id
  AND cp.class_key = CONCAT('grade_', d.class_level::text);

-- Migrate questions table: subject_id → subject_parent_id, class_level → class_parent_id
UPDATE questions q
SET subject_parent_id = sp.id
FROM subjects_parent sp, subjects s
WHERE q.subject_id IS NOT NULL 
  AND q.subject_parent_id IS NULL
  AND sp.parent_id = q.user_id
  AND s.id = q.subject_id
  AND sp.subject_key = LOWER(REPLACE(s.name, ' ', '_'));

UPDATE questions q
SET class_parent_id = cp.id
FROM classes_parent cp
WHERE q.class_level IS NOT NULL
  AND q.class_parent_id IS NULL
  AND cp.parent_id = q.user_id
  AND cp.class_key = CONCAT('grade_', q.class_level::text);

-- Migrate question_papers table: subject_id → subject_parent_id, class_level → class_parent_id
UPDATE question_papers qp
SET subject_parent_id = sp.id
FROM subjects_parent sp, subjects s
WHERE qp.subject_id IS NOT NULL 
  AND qp.subject_parent_id IS NULL
  AND sp.parent_id = qp.user_id
  AND s.id = qp.subject_id
  AND sp.subject_key = LOWER(REPLACE(s.name, ' ', '_'));

UPDATE question_papers qp
SET class_parent_id = cp.id
FROM classes_parent cp
WHERE qp.class_level IS NOT NULL
  AND qp.class_parent_id IS NULL
  AND cp.parent_id = qp.user_id
  AND cp.class_key = CONCAT('grade_', qp.class_level::text);

-- Migrate child_subject_assignments table: subject_id → subject_parent_id
UPDATE child_subject_assignments csa
SET subject_parent_id = sp.id
FROM subjects_parent sp, subjects s
WHERE csa.subject_id IS NOT NULL 
  AND csa.subject_parent_id IS NULL
  AND sp.parent_id = csa.parent_id
  AND s.id = csa.subject_id
  AND sp.subject_key = LOWER(REPLACE(s.name, ' ', '_'));

-- Migrate child_class_assignments table: class_level → class_parent_id
UPDATE child_class_assignments cca
SET class_parent_id = cp.id
FROM classes_parent cp
WHERE cca.class_level IS NOT NULL
  AND cca.class_parent_id IS NULL
  AND cp.parent_id = cca.parent_id
  AND cp.class_key = CONCAT('grade_', cca.class_level::text);

-- Recreate the triggers
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_papers_updated_at
  BEFORE UPDATE ON question_papers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_subject_assignments_updated_at
  BEFORE UPDATE ON child_subject_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_class_assignments_updated_at
  BEFORE UPDATE ON child_class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();