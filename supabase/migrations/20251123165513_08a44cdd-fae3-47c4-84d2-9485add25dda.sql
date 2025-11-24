-- Add DELETE policy for document_pages
-- Allow users to delete pages from their own documents
CREATE POLICY "Users can delete their own document pages"
ON public.document_pages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_pages.document_id
    AND documents.user_id = auth.uid()
  )
);