-- Phase 1: Create Child Class Assignment Table
CREATE TABLE child_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_level class_level_enum NOT NULL,
  academic_year TEXT NOT NULL DEFAULT EXTRACT(year FROM now())::TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, academic_year)
);

-- Phase 1: Create Child Subject Assignment Table
CREATE TABLE child_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL DEFAULT EXTRACT(year FROM now())::TEXT,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, subject_id, academic_year)
);

-- Enable RLS on both tables
ALTER TABLE child_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_subject_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for child_class_assignments
CREATE POLICY "Parents can manage their children's class assignments" 
ON child_class_assignments 
FOR ALL 
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Children can view their own class assignments" 
ON child_class_assignments 
FOR SELECT 
USING (auth.uid() = child_id);

-- RLS Policies for child_subject_assignments  
CREATE POLICY "Parents can manage their children's subject assignments" 
ON child_subject_assignments 
FOR ALL 
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Children can view their own subject assignments" 
ON child_subject_assignments 
FOR SELECT 
USING (auth.uid() = child_id);

-- Add triggers for updated_at
CREATE TRIGGER update_child_class_assignments_updated_at
BEFORE UPDATE ON child_class_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_subject_assignments_updated_at
BEFORE UPDATE ON child_subject_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();