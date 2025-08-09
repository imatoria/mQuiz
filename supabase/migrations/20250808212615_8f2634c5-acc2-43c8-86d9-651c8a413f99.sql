-- Create table to store extracted PDF text per page
CREATE TABLE IF NOT EXISTS public.document_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

-- Allow users to read pages of their own documents
CREATE POLICY "Users can view their own document pages"
ON public.document_pages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_pages.document_id
      AND d.user_id = auth.uid()
  )
);

-- Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS document_pages_document_id_page_number_idx
  ON public.document_pages (document_id, page_number);

CREATE INDEX IF NOT EXISTS document_pages_document_id_idx
  ON public.document_pages (document_id);
