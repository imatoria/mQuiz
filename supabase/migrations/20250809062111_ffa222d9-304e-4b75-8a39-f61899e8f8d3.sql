-- Create table to store user-selected page numbers per subject/class across documents
create table if not exists public.document_page_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_id uuid not null references public.documents(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  class_level public.class_level not null,
  page_number integer not null check (page_number > 0),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.document_page_selections enable row level security;

-- Policies: users manage their own selections
create policy if not exists "Users can insert their own page selections"
  on public.document_page_selections for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view their own page selections"
  on public.document_page_selections for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update their own page selections"
  on public.document_page_selections for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own page selections"
  on public.document_page_selections for delete
  using (auth.uid() = user_id);

-- Prevent duplicates across earlier uploads for same user+subject+class+page
create unique index if not exists uq_page_selection_user_subject_class_page
  on public.document_page_selections (user_id, subject_id, class_level, page_number);

-- Helpful index for per-document display
create index if not exists idx_page_selection_document_page
  on public.document_page_selections (document_id, page_number desc);
