-- CivFlow — Project document library.
--
-- Contracts, insurance certificates, plans, and permits currently only
-- exist buried inside whichever diary entry they happened to be uploaded
-- to. This is a flat per-project list instead, so "where's the contract"
-- is a one-click answer. Reuses the existing diary-media storage bucket
-- (already permissive to any authenticated user, same trust boundary as
-- diary photos/voice notes) under a documents/ prefix, rather than
-- standing up a second bucket with its own policies.

create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  category text not null default 'other' check (category in ('contract', 'insurance', 'plans', 'permit', 'other')),
  title text not null,
  storage_path text not null,
  file_name text,
  uploaded_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy "members can manage documents in their company" on documents
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_documents after insert or update or delete on documents
  for each row execute function public.log_audit();
