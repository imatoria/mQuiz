# Parent-Specific Class & Subject Implementation Plan

## Overview
Migrate from shared class levels and subjects to parent-specific records, allowing each parent to customize their own class levels and subjects.

---

## 1. Database Schema Changes

### 1.1 Create `classes_parent` Table
```sql
CREATE TABLE public.classes_parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  class_key TEXT NOT NULL, -- e.g., 'grade_1', 'grade_2', etc.
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, class_key)
);

-- Enable RLS
ALTER TABLE public.classes_parent ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Parents can manage their own classes"
ON public.classes_parent
FOR ALL
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Children can view their parent's classes
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
```

### 1.2 Create `subjects_parent` Table
```sql
CREATE TABLE public.subjects_parent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_key TEXT, -- Optional: for predefined subjects
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, subject_name)
);

-- Enable RLS
ALTER TABLE public.subjects_parent ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Parents can manage their own subjects"
ON public.subjects_parent
FOR ALL
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Children can view their parent's subjects
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
```

### 1.3 Update Foreign Key References

#### Update `child_class_assignments`
```sql
-- Add new column
ALTER TABLE public.child_class_assignments
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_child_class_assignments_class_parent ON public.child_class_assignments(class_parent_id);
```

#### Update `child_subject_assignments`
```sql
-- Add new column
ALTER TABLE public.child_subject_assignments
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_child_subject_assignments_subject_parent ON public.child_subject_assignments(subject_parent_id);
```

#### Update `questions`
```sql
-- Add new column
ALTER TABLE public.questions
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_questions_subject_parent ON public.questions(subject_parent_id);
CREATE INDEX idx_questions_class_parent ON public.questions(class_parent_id);
```

#### Update `question_papers`
```sql
-- Add new column
ALTER TABLE public.question_papers
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_question_papers_subject_parent ON public.question_papers(subject_parent_id);
CREATE INDEX idx_question_papers_class_parent ON public.question_papers(class_parent_id);
```

#### Update `documents`
```sql
-- Add new column
ALTER TABLE public.documents
ADD COLUMN subject_parent_id UUID REFERENCES public.subjects_parent(id) ON DELETE SET NULL,
ADD COLUMN class_parent_id UUID REFERENCES public.classes_parent(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_documents_subject_parent ON public.documents(subject_parent_id);
CREATE INDEX idx_documents_class_parent ON public.documents(class_parent_id);
```

---

## 2. Data Migration Strategy

### 2.1 Seed Default Classes and Subjects
```sql
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
```

### 2.2 Migrate Existing Data
```sql
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
```

---

## 3. Custom Hooks Updates

### 3.1 Create `useClassesParent.ts`
**File**: `src/hooks/useClassesParent.ts`
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClassParent {
  id: string;
  parent_id: string;
  class_name: string;
  class_key: string;
  display_order: number;
  is_active: boolean;
}

export const useClassesParent = () => {
  const [classes, setClasses] = useState<ClassParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('classes_parent')
        .select('*')
        .eq('parent_id', user.user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setClasses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const addClass = async (className: string, classKey: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const maxOrder = Math.max(...classes.map(c => c.display_order), 0);

    const { error } = await supabase
      .from('classes_parent')
      .insert({
        parent_id: user.user.id,
        class_name: className,
        class_key: classKey,
        display_order: maxOrder + 1,
      });

    if (error) throw error;
    await fetchClasses();
  };

  const updateClass = async (id: string, updates: Partial<ClassParent>) => {
    const { error } = await supabase
      .from('classes_parent')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchClasses();
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase
      .from('classes_parent')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchClasses();
  };

  return {
    classes,
    isLoading,
    error,
    refetch: fetchClasses,
    addClass,
    updateClass,
    deleteClass,
  };
};
```

### 3.2 Create `useSubjectsParent.ts`
**File**: `src/hooks/useSubjectsParent.ts`
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubjectParent {
  id: string;
  parent_id: string;
  subject_name: string;
  subject_key: string | null;
  description: string | null;
  is_active: boolean;
}

export const useSubjectsParent = () => {
  const [subjects, setSubjects] = useState<SubjectParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subjects_parent')
        .select('*')
        .eq('parent_id', user.user.id)
        .eq('is_active', true)
        .order('subject_name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const addSubject = async (subjectName: string, description?: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subjects_parent')
      .insert({
        parent_id: user.user.id,
        subject_name: subjectName,
        description: description || null,
      });

    if (error) throw error;
    await fetchSubjects();
  };

  const updateSubject = async (id: string, updates: Partial<SubjectParent>) => {
    const { error } = await supabase
      .from('subjects_parent')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase
      .from('subjects_parent')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await fetchSubjects();
  };

  return {
    subjects,
    isLoading,
    error,
    refetch: fetchSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
  };
};
```

### 3.3 Update `useChildClasses.ts`
**File**: `src/hooks/useChildClasses.ts`
- Replace references to `class_level` enum with `class_parent_id`
- Update queries to join with `classes_parent` table
- Return class objects instead of enum values

### 3.4 Update `useChildSubjects.ts`
**File**: `src/hooks/useChildSubjects.ts`
- Replace references to old `subjects` table with `subjects_parent`
- Update foreign key from `subject_id` to `subject_parent_id`

---

## 4. UI Component Updates

### 4.1 Create `ClassManagementParent.tsx`
**File**: `src/components/parent/ClassManagementParent.tsx`
- List all classes for the parent
- Add/edit/delete class functionality
- Reorder classes (drag & drop or up/down buttons)

### 4.2 Create `SubjectManagementParent.tsx`
**File**: `src/components/parent/SubjectManagementParent.tsx`
- List all subjects for the parent
- Add/edit/delete subject functionality
- Optional: Import subjects from predefined list

### 4.3 Update `ChildClassAssignment.tsx`
**File**: `src/components/parent/ChildClassAssignment.tsx`
- Use `useClassesParent` instead of hardcoded class levels
- Update to use `class_parent_id` instead of `class_level` enum

### 4.4 Update `ChildSubjectAssignment.tsx`
**File**: `src/components/parent/ChildSubjectAssignment.tsx`
- Use `useSubjectsParent` instead of fetching from old subjects table
- Update to use `subject_parent_id` instead of `subject_id`

### 4.5 Update `UnifiedPaperCreator.tsx`
**File**: `src/components/parent/UnifiedPaperCreator.tsx`
- Replace subject and class selectors with parent-specific versions
- Update form to use new foreign keys

### 4.6 Update `QuestionBank.tsx`
**File**: `src/components/parent/QuestionBank.tsx`
- Update filters to use parent-specific classes and subjects
- Update queries to use new foreign keys

### 4.7 Update `DocumentUpload.tsx`
**File**: `src/components/parent/DocumentUpload.tsx`
- Update selectors to use parent-specific data
- Update form submission to use new foreign keys

---

## 5. Edge Function Updates

### 5.1 Update `generate-ai-questions`
**File**: `supabase/functions/generate-ai-questions/index.ts`
- Update to accept `subject_parent_id` and `class_parent_id`
- Query `subjects_parent` and `classes_parent` tables
- Insert questions with new foreign keys

### 5.2 Update `process-document`
**File**: `supabase/functions/process-document/index.ts`
- Update to use `subject_parent_id` and `class_parent_id`
- Query parent-specific tables for validation

---

## 6. Migration Phases

### Phase 1: Database Setup ✅ COMPLETED
1. ✅ Created new tables with RLS policies (classes_parent, subjects_parent)
2. ✅ Added new foreign key columns to existing tables
3. ✅ Created seed functions (seed_default_classes_parent, seed_default_subjects_parent)
4. ✅ Run initial data migration for existing parents
5. ✅ Created auto-seed trigger for new parents

### Phase 2: Backend Updates ✅ COMPLETED
1. ✅ Created new custom hooks (useClassesParent, useSubjectsParent)
2. ✅ Created management components (ClassManagementParent, SubjectManagementParent)
3. Edge functions will be updated in next phase

### Phase 3: UI Updates (Week 2-3)
1. Create class and subject management components
2. Update all existing components to use new hooks
3. Update forms to use new foreign keys

### Phase 4: Testing & Cleanup (Week 3-4)
1. Comprehensive testing
2. Remove old enum types (after confirming all data migrated)
3. Remove old `class_level` and `subject_id` columns (after confirming)
4. Update documentation

---

## 7. Rollback Strategy

### If Issues Arise:
1. Keep old columns until migration is fully validated
2. Use feature flags to switch between old and new systems
3. Maintain dual writes temporarily (write to both old and new columns)
4. Only drop old columns after 100% confidence

---

## 8. Testing Checklist

- [ ] Parent can create/edit/delete custom classes
- [ ] Parent can create/edit/delete custom subjects
- [ ] Child can view parent's classes and subjects
- [ ] Class assignments work with new table
- [ ] Subject assignments work with new table
- [ ] Question creation uses parent-specific data
- [ ] Paper creation uses parent-specific data
- [ ] Document upload uses parent-specific data
- [ ] Edge functions work with new schema
- [ ] RLS policies prevent cross-parent data access
- [ ] Migration doesn't break existing functionality

---

## 9. Performance Considerations

1. **Indexes**: All foreign keys have indexes
2. **Caching**: Consider adding client-side caching for classes/subjects
3. **Lazy Loading**: Load classes/subjects only when needed
4. **Batch Operations**: Use batch inserts for default data seeding

---

## 10. Security Considerations

1. **RLS Policies**: Strictly enforce parent-level isolation
2. **Validation**: Validate parent ownership in all edge functions
3. **Cascade Deletes**: Properly configured to prevent orphaned records
4. **Audit Trail**: Consider adding audit logs for class/subject modifications

---

## 11. File Naming Convention

### Tables
- `classes_parent` (not `parent_classes`)
- `subjects_parent` (not `parent_subjects`)

### Hooks
- `useClassesParent.ts`
- `useSubjectsParent.ts`
- `useChildClasses.ts` (already follows convention)
- `useChildSubjects.ts` (already follows convention)

### Components
- `ClassManagementParent.tsx`
- `SubjectManagementParent.tsx`
- `ChildClassAssignment.tsx`
- `ChildSubjectAssignment.tsx`

### Edge Functions
- No changes needed (they accept parameters, not tied to naming)

---

## 12. Next Steps

1. Review and approve this plan
2. Create database migration scripts
3. Implement custom hooks
4. Update UI components
5. Test thoroughly
6. Deploy in phases
