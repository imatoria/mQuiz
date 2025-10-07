-- Phase 3.1: Drop Foreign Key Constraints for Legacy Columns
-- This removes constraints on columns that will be dropped next

-- Drop subject_id foreign keys
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_subject_id_fkey;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_subject_id_fkey;
ALTER TABLE question_papers DROP CONSTRAINT IF EXISTS question_papers_subject_id_fkey;
ALTER TABLE child_subject_assignments DROP CONSTRAINT IF EXISTS child_subject_assignments_subject_id_fkey;

-- Note: class_level is an enum type, not a foreign key, so no constraints to drop