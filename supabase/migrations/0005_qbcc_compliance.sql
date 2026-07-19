-- CivFlow — QBCC compliance tracking.
-- Adds licence/MFR tracking at the company and individual level, a
-- Directions to Rectify register (the QBCC's defect-rectification notice,
-- typically with a 35-day statutory clock), and notifiable-incident
-- reporting fields on safety observations (relevant since the Feb 2026
-- Tranche 3 reforms raised penalties for unreported serious incidents).
--
-- This is a tracking/reminder tool, not a compliance guarantee — the
-- company is still responsible for meeting its actual QBCC obligations.

-- ---------------------------------------------------------------------------
-- Company-level licence & MFR tracking
-- ---------------------------------------------------------------------------

alter table companies add column qbcc_licence_number text;
alter table companies add column qbcc_licence_class text;
alter table companies add column qbcc_licence_expiry date;
alter table companies add column mfr_category text check (
  mfr_category in ('SC1', 'SC2', 'CAT1', 'CAT2', 'CAT3', 'CAT4', 'CAT5', 'CAT6', 'CAT7')
);
alter table companies add column mfr_report_due_date date;

-- Companies previously had no update policy at all (only select) — admins
-- need to be able to set the fields above.
create policy "admins can update their company" on companies
  for update using (
    id = public.current_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (id = public.current_company_id());

-- ---------------------------------------------------------------------------
-- Individual licence tracking (e.g. a nominee or site supervisor's own
-- QBCC licence, separate from the company's contractor licence)
-- ---------------------------------------------------------------------------

alter table profiles add column qbcc_licence_number text;
alter table profiles add column qbcc_licence_class text;
alter table profiles add column qbcc_licence_expiry date;

-- ---------------------------------------------------------------------------
-- Directions to Rectify (QBCC notice to fix defective/incomplete work)
-- ---------------------------------------------------------------------------

create table directions_to_rectify (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  description text not null,
  issued_date date not null default current_date,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'rectified', 'disputed', 'overdue')),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table directions_to_rectify enable row level security;

create policy "members can manage directions to rectify in their company" on directions_to_rectify
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_directions_to_rectify after insert or update or delete on directions_to_rectify
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Notifiable incident reporting on safety observations
-- ---------------------------------------------------------------------------

alter table safety_observations add column notifiable boolean not null default false;
alter table safety_observations add column reported_at timestamptz;
alter table safety_observations add column report_reference text;
