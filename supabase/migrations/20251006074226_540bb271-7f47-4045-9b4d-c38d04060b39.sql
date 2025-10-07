-- Phase 3.2: Drop Old Columns
-- Remove legacy subject_id and class_level columns that have been replaced

-- Drop subject_id columns (replaced by subject_parent_id)
ALTER TABLE documents DROP COLUMN IF EXISTS subject_id;
ALTER TABLE questions DROP COLUMN IF EXISTS subject_id;
ALTER TABLE question_papers DROP COLUMN IF EXISTS subject_id;
ALTER TABLE child_subject_assignments DROP COLUMN IF EXISTS subject_id;

-- Drop class_level columns (replaced by class_parent_id)
ALTER TABLE documents DROP COLUMN IF EXISTS class_level;
ALTER TABLE questions DROP COLUMN IF EXISTS class_level;
ALTER TABLE question_papers DROP COLUMN IF EXISTS class_level;
ALTER TABLE child_class_assignments DROP COLUMN IF EXISTS class_level;