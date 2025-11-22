-- Add INSERT policy for document_pages
-- Users can insert pages for their own documents
CREATE POLICY "Users can insert pages for their own documents"
ON public.document_pages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_pages.document_id
    AND documents.user_id = auth.uid()
  )
);