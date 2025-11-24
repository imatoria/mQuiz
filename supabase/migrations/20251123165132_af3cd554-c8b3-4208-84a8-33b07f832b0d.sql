-- Add updated_at column to document_pages table
ALTER TABLE public.document_pages 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_document_pages_updated_at
  BEFORE UPDATE ON public.document_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill existing rows with created_at value
UPDATE public.document_pages 
SET updated_at = created_at 
WHERE updated_at IS NULL;