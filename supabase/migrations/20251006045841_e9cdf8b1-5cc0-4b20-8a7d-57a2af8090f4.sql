-- Phase 1: Database Schema Changes

-- 1.1 Create classes_parent table
CREATE TABLE public.classes_parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, class_key)
);

-- Enable RLS
ALTER TABLE public.classes_parent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes_parent
CREATE POLICY "Parents can manage their own classes"
ON public.classes_parent
FOR ALL
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Children can view their parent's classes"
ON public.classes_parent
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_child_relationships
    WHERE parent_id = classes_parent.parent_id
    AND child_id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_classes_parent_parent_id ON public.classes_parent(parent_id);
CREATE INDEX idx_classes_parent_active ON public.classes_parent(parent_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_classes_parent_updated_at
BEFORE UPDATE ON public.classes_parent
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 Create subjects_parent table
CREATE TABLE public.subjects_parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_key TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, subject_name)
);

-- Enable RLS
ALTER TABLE public.subjects_parent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects_parent
CREATE POLICY "Parents can manage their own subjects"
ON public.subjects_parent
FOR ALL
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Children can view their parent's subjects"
ON public.subjects_parent
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_child_relationships
    WHERE parent_id = subjects_parent.parent_id
    AND child_id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX idx_subjects_parent_parent_id ON public.subjects_parent(parent_id);
CREATE INDEX idx_subjects_parent_active ON public.subjects_parent(parent_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_subjects_parent_updated_at
BEFORE UPDATE ON public.subjects_parent
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.3 Update Foreign Key References
-- Add new columns to child_class_assignments
ALTER TABLE public.child_class_assignments
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

CREATE INDEX idx_child_class_assignments_class_parent ON public.child_class_assignments(class_parent_id);

-- Add new columns to child_subject_assignments
ALTER TABLE public.child_subject_assignments
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL;

CREATE INDEX idx_child_subject_assignments_subject_parent ON public.child_subject_assignments(subject_parent_id);

-- Add new columns to questions
ALTER TABLE public.questions
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

CREATE INDEX idx_questions_subject_parent ON public.questions(subject_parent_id);
CREATE INDEX idx_questions_class_parent ON public.questions(class_parent_id);

-- Add new columns to question_papers
ALTER TABLE public.question_papers
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

CREATE INDEX idx_question_papers_subject_parent ON public.question_papers(subject_parent_id);
CREATE INDEX idx_question_papers_class_parent ON public.question_papers(class_parent_id);

-- Add new columns to documents
ALTER TABLE public.documents
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_subject_parent ON public.documents(subject_parent_id);
CREATE INDEX idx_documents_class_parent ON public.documents(class_parent_id);

-- 1.4 Create Seed Functions
-- Function to create default classes for a parent
CREATE OR REPLACE FUNCTION public.seed_default_classes_parent(p_parent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.classes_parent (parent_id, class_name, class_key, display_order)
  VALUES
    (p_parent_id, 'Grade 1', 'grade_1', 1),
    (p_parent_id, 'Grade 2', 'grade_2', 2),
    (p_parent_id, 'Grade 3', 'grade_3', 3),
    (p_parent_id, 'Grade 4', 'grade_4', 4),
    (p_parent_id, 'Grade 5', 'grade_5', 5),
    (p_parent_id, 'Grade 6', 'grade_6', 6),
    (p_parent_id, 'Grade 7', 'grade_7', 7),
    (p_parent_id, 'Grade 8', 'grade_8', 8),
    (p_parent_id, 'Grade 9', 'grade_9', 9),
    (p_parent_id, 'Grade 10', 'grade_10', 10),
    (p_parent_id, 'Grade 11', 'grade_11', 11),
    (p_parent_id, 'Grade 12', 'grade_12', 12)
  ON CONFLICT (parent_id, class_key) DO NOTHING;
END;
$$;

-- Function to create default subjects for a parent
CREATE OR REPLACE FUNCTION public.seed_default_subjects_parent(p_parent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subjects_parent (parent_id, subject_name, subject_key)
  SELECT p_parent_id, name, LOWER(REPLACE(name, ' ', '_'))
  FROM public.subjects
  ON CONFLICT (parent_id, subject_name) DO NOTHING;
END;
$$;

-- Trigger to auto-seed for new parents
CREATE OR REPLACE FUNCTION public.auto_seed_parent_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'parent' AND NEW.is_approved = true THEN
    PERFORM public.seed_default_classes_parent(NEW.user_id);
    PERFORM public.seed_default_subjects_parent(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_seed_parent_defaults_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_parent_defaults();

-- Migrate existing parent data
DO $$
DECLARE
  parent_record RECORD;
BEGIN
  FOR parent_record IN 
    SELECT user_id FROM profiles WHERE role = 'parent' AND is_approved = true
  LOOP
    PERFORM public.seed_default_classes_parent(parent_record.user_id);
    PERFORM public.seed_default_subjects_parent(parent_record.user_id);
  END LOOP;
END $$;