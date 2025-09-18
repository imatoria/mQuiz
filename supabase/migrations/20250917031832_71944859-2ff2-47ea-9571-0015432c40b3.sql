-- Add markdown_content column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS markdown_content TEXT;