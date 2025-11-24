-- Allow users to update pages for their own documents
CREATE POLICY "Users can update their own document pages"
ON public.document_pages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_pages.document_id
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_pages.document_id
    AND documents.user_id = auth.uid()
  )
);