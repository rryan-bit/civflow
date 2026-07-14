-- CivFlow MVP schema — Stage 1 (AI Site Diary Assistant)
-- Run this in the Supabase SQL editor, or via `supabase db push` once the
-- Supabase CLI is linked to a project. See README.md for setup steps.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tenancy: companies, profiles, projects
-- ---------------------------------------------------------------------------

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references companies (id) on delete set null,
  full_name text,
  role text not null default 'supervisor' check (role in ('supervisor', 'project_manager', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- New users start with no company_id — an admin (or an onboarding flow,
-- added later) assigns them to a company.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used throughout RLS policies: the caller's company_id.
create function public.current_company_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  site_address text,
  site_lat numeric,
  site_lng numeric,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Site diary entries and everything AI extracts from them
-- ---------------------------------------------------------------------------

create table diary_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  created_by uuid not null references profiles (id),
  entry_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved')),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'document')),
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table voice_notes (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  storage_path text not null,
  transcript text,
  created_at timestamptz not null default now()
);

create table labor_records (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  trade text not null,
  worker_count integer not null default 0,
  hours numeric,
  notes text
);

create table equipment_records (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  equipment_name text not null,
  hours_used numeric,
  notes text
);

create table weather_logs (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  condition text,
  temp_c numeric,
  wind_kph numeric,
  rainfall_mm numeric,
  source text not null default 'auto' check (source in ('auto', 'manual'))
);

create table safety_observations (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  severity text not null check (severity in ('info', 'minor', 'major', 'incident')),
  description text not null,
  action_taken text
);

create table progress_notes (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  summary text,
  percent_complete numeric
);

create table client_reports (
  id uuid primary key default gen_random_uuid(),
  diary_entry_id uuid not null references diary_entries (id) on delete cascade,
  pdf_storage_path text,
  sent_to text,
  sent_at timestamptz
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references profiles (id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped to the caller's company
-- ---------------------------------------------------------------------------

alter table companies enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table diary_entries enable row level security;
alter table media_assets enable row level security;
alter table voice_notes enable row level security;
alter table labor_records enable row level security;
alter table equipment_records enable row level security;
alter table weather_logs enable row level security;
alter table safety_observations enable row level security;
alter table progress_notes enable row level security;
alter table client_reports enable row level security;
alter table audit_log enable row level security;

create policy "members can view their own company" on companies
  for select using (id = public.current_company_id());

create policy "members can view profiles in their company" on profiles
  for select using (company_id = public.current_company_id());
create policy "users can update their own profile" on profiles
  for update using (id = auth.uid());

create policy "members can manage projects in their company" on projects
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "members can manage diary entries in their company" on diary_entries
  for all using (
    project_id in (select id from projects where company_id = public.current_company_id())
  )
  with check (
    project_id in (select id from projects where company_id = public.current_company_id())
  );

-- Child tables of diary_entries all follow the same pattern: allow access
-- if the parent diary entry belongs to a project in the caller's company.
create policy "members can manage media in their company" on media_assets
  for all using (
    diary_entry_id in (
      select de.id from diary_entries de
      join projects p on p.id = de.project_id
      where p.company_id = public.current_company_id()
    )
  )
  with check (
    diary_entry_id in (
      select de.id from diary_entries de
      join projects p on p.id = de.project_id
      where p.company_id = public.current_company_id()
    )
  );

create policy "members can manage voice notes in their company" on voice_notes
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage labor records in their company" on labor_records
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage equipment records in their company" on equipment_records
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage weather logs in their company" on weather_logs
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage safety observations in their company" on safety_observations
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage progress notes in their company" on progress_notes
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can manage client reports in their company" on client_reports
  for all using (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  )
  with check (
    diary_entry_id in (select de.id from diary_entries de join projects p on p.id = de.project_id where p.company_id = public.current_company_id())
  );

create policy "members can view audit log for their company" on audit_log
  for select using (
    actor_id in (select id from profiles where company_id = public.current_company_id())
  );

-- ---------------------------------------------------------------------------
-- Storage buckets for media, voice notes, and generated PDFs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('diary-media', 'diary-media', false)
on conflict (id) do nothing;

create policy "authenticated users can upload diary media"
  on storage.objects for insert
  with check (bucket_id = 'diary-media' and auth.role() = 'authenticated');

create policy "authenticated users can read diary media"
  on storage.objects for select
  using (bucket_id = 'diary-media' and auth.role() = 'authenticated');
