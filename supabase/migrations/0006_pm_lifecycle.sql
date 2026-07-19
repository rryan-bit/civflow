-- CivFlow — Full project-manager lifecycle coverage.
-- Adds the remaining registers a QLD project manager needs day-to-day and
-- at project close-out: BIF Act payment claim tracking, a subcontractor
-- register with SWMS (high-risk work method statement) tracking, quality
-- inspections (ITP hold/witness points) with non-conformance reports, and
-- a practical completion / defects-liability / handover workflow.
--
-- This is a tracking and reminder tool, not a compliance guarantee or a
-- payment system — CivFlow does not move money or file statutory notices.

-- ---------------------------------------------------------------------------
-- Payment claims (Building Industry Fairness (Security of Payment) Act 2017)
-- ---------------------------------------------------------------------------

create table payment_claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  claim_number text,
  claim_date date not null default current_date,
  amount_claimed numeric(12, 2) not null,
  due_date date not null,
  schedule_due_date date,
  status text not null default 'submitted' check (status in ('submitted', 'schedule_received', 'paid', 'disputed')),
  scheduled_amount numeric(12, 2),
  scheduled_date date,
  paid_amount numeric(12, 2),
  paid_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table payment_claims enable row level security;

create policy "members can manage payment claims in their company" on payment_claims
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_payment_claims after insert or update or delete on payment_claims
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Subcontractor register
-- ---------------------------------------------------------------------------

create table subcontractors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  company_name text not null,
  trade text,
  contact_name text,
  contact_phone text,
  contact_email text,
  qbcc_licence_number text,
  licence_expiry date,
  insurance_expiry date,
  notes text,
  created_at timestamptz not null default now()
);

alter table subcontractors enable row level security;

create policy "members can manage subcontractors in their company" on subcontractors
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_subcontractors after insert or update or delete on subcontractors
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Safe Work Method Statements (high-risk construction work)
-- ---------------------------------------------------------------------------

create table swms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  subcontractor_id uuid references subcontractors (id) on delete set null,
  title text not null,
  received_date date,
  review_due_date date,
  status text not null default 'current' check (status in ('current', 'review_due', 'expired', 'superseded')),
  document_reference text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table swms enable row level security;

create policy "members can manage swms in their company" on swms
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_swms after insert or update or delete on swms
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Quality: inspections (ITP hold points / witness points / final)
-- ---------------------------------------------------------------------------

create table inspections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  work_area text not null,
  inspection_type text not null default 'hold_point' check (inspection_type in ('hold_point', 'witness_point', 'final')),
  status text not null default 'pending' check (status in ('pending', 'passed', 'passed_with_notes', 'failed')),
  scheduled_date date,
  inspected_date date,
  inspector_name text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table inspections enable row level security;

create policy "members can manage inspections in their company" on inspections
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_inspections after insert or update or delete on inspections
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Quality: non-conformance reports
-- ---------------------------------------------------------------------------

create table non_conformance_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  inspection_id uuid references inspections (id) on delete set null,
  description text not null,
  trade text,
  raised_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'closed', 'disputed')),
  corrective_action text,
  closed_date date,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table non_conformance_reports enable row level security;

create policy "members can manage ncrs in their company" on non_conformance_reports
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_ncrs after insert or update or delete on non_conformance_reports
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Practical completion, defects liability, and handover
-- ---------------------------------------------------------------------------

alter table projects add column practical_completion_date date;
alter table projects add column defects_liability_end_date date;

create table defects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  description text not null,
  location text,
  status text not null default 'open' check (status in ('open', 'rectified')),
  noted_date date not null default current_date,
  due_date date,
  rectified_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table defects enable row level security;

create policy "members can manage defects in their company" on defects
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_defects after insert or update or delete on defects
  for each row execute function public.log_audit();

create table handover_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label text not null,
  category text not null default 'general',
  completed boolean not null default false,
  completed_date date,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table handover_items enable row level security;

create policy "members can manage handover items in their company" on handover_items
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));
