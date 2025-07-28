-- Create storage bucket for PDF documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create enum types
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'difficult');
CREATE TYPE public.class_level AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert common subjects
INSERT INTO public.subjects (name) VALUES 
  ('Mathematics'), ('Science'), ('English'), ('History'), ('Geography'), 
  ('Physics'), ('Chemistry'), ('Biology'), ('Computer Science'), ('Hindi');

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  class_level class_level NOT NULL,
  total_pages INTEGER,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  difficulty difficulty_level NOT NULL,
  page_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question papers table
CREATE TABLE public.question_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  class_level class_level NOT NULL,
  total_questions INTEGER NOT NULL,
  time_limit_minutes INTEGER NOT NULL,
  difficulty_filter difficulty_level[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question paper questions junction table
CREATE TABLE public.question_paper_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_paper_id UUID REFERENCES public.question_papers(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL,
  UNIQUE(question_paper_id, question_id),
  UNIQUE(question_paper_id, question_order)
);

-- Create scheduled tests table
CREATE TABLE public.scheduled_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_paper_id UUID REFERENCES public.question_papers(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  assign_to_all BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test assignments table (for specific children assignment)
CREATE TABLE public.test_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_test_id UUID REFERENCES public.scheduled_tests(id) ON DELETE CASCADE NOT NULL,
  assigned_to_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scheduled_test_id, assigned_to_user_id)
);

-- Create test attempts table
CREATE TABLE public.test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_test_id UUID REFERENCES public.scheduled_tests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_questions INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answers JSONB
);

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_paper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for questions
CREATE POLICY "Users can view questions from their documents" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.documents WHERE documents.id = questions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can create questions for their documents" ON public.questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.documents WHERE documents.id = questions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can update questions from their documents" ON public.questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.documents WHERE documents.id = questions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can delete questions from their documents" ON public.questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.documents WHERE documents.id = questions.document_id AND documents.user_id = auth.uid())
);

-- Create RLS policies for question papers
CREATE POLICY "Users can view their own question papers" ON public.question_papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own question papers" ON public.question_papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own question papers" ON public.question_papers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own question papers" ON public.question_papers FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for question paper questions
CREATE POLICY "Users can view question paper questions" ON public.question_paper_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.question_papers WHERE question_papers.id = question_paper_questions.question_paper_id AND question_papers.user_id = auth.uid())
);
CREATE POLICY "Users can create question paper questions" ON public.question_paper_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.question_papers WHERE question_papers.id = question_paper_questions.question_paper_id AND question_papers.user_id = auth.uid())
);
CREATE POLICY "Users can update question paper questions" ON public.question_paper_questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.question_papers WHERE question_papers.id = question_paper_questions.question_paper_id AND question_papers.user_id = auth.uid())
);
CREATE POLICY "Users can delete question paper questions" ON public.question_paper_questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.question_papers WHERE question_papers.id = question_paper_questions.question_paper_id AND question_papers.user_id = auth.uid())
);

-- Create RLS policies for scheduled tests
CREATE POLICY "Users can view their own scheduled tests" ON public.scheduled_tests FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Users can create their own scheduled tests" ON public.scheduled_tests FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update their own scheduled tests" ON public.scheduled_tests FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete their own scheduled tests" ON public.scheduled_tests FOR DELETE USING (auth.uid() = creator_id);

-- Create RLS policies for test assignments
CREATE POLICY "Users can view test assignments for their tests" ON public.test_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.scheduled_tests WHERE scheduled_tests.id = test_assignments.scheduled_test_id AND scheduled_tests.creator_id = auth.uid())
);
CREATE POLICY "Users can create test assignments for their tests" ON public.test_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.scheduled_tests WHERE scheduled_tests.id = test_assignments.scheduled_test_id AND scheduled_tests.creator_id = auth.uid())
);
CREATE POLICY "Users can update test assignments for their tests" ON public.test_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.scheduled_tests WHERE scheduled_tests.id = test_assignments.scheduled_test_id AND scheduled_tests.creator_id = auth.uid())
);
CREATE POLICY "Users can delete test assignments for their tests" ON public.test_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.scheduled_tests WHERE scheduled_tests.id = test_assignments.scheduled_test_id AND scheduled_tests.creator_id = auth.uid())
);

-- Create RLS policies for test attempts
CREATE POLICY "Users can view their own test attempts" ON public.test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own test attempts" ON public.test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own test attempts" ON public.test_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Create storage policies for documents
CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_question_papers_updated_at
  BEFORE UPDATE ON public.question_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_tests_updated_at
  BEFORE UPDATE ON public.scheduled_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();