-- Phase 1: Database Schema Migration

-- First, let's check if document_pages already has content column (it should according to schema)
-- If it exists, we'll add markdown_content column instead as mentioned in the plan

-- Add markdown_content column to document_pages table
ALTER TABLE document_pages ADD COLUMN IF NOT EXISTS markdown_content TEXT;

-- Remove unused columns from documents table
ALTER TABLE documents DROP COLUMN IF EXISTS file_path;
ALTER TABLE documents DROP COLUMN IF EXISTS updated_at;
ALTER TABLE documents DROP COLUMN IF EXISTS current_version;
ALTER TABLE documents DROP COLUMN IF EXISTS markdown_content;

-- Drop unused tables (in dependency order)
DROP TABLE IF EXISTS document_page_selections CASCADE;
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS book_documents CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS user_subjects CASCADE;