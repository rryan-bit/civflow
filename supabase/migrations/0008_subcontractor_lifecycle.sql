-- CivFlow — Full subcontractor lifecycle: quote -> award -> progress
-- payments (with retention) -> completion -> retention release.
--
-- This is a tracking tool, not a trust-account ledger — for projects
-- running an actual BIF Act retention trust account, the trust account
-- itself is still the legal record; this just helps a PM keep on top of
-- who's owed what and when retention is due back.

-- ---------------------------------------------------------------------------
-- Subcontractor lifecycle fields
-- ---------------------------------------------------------------------------

alter table subcontractors add column status text not null default 'quoting' check (
  status in ('quoting', 'awarded', 'active', 'complete', 'terminated')
);
alter table subcontractors add column scope_of_works text;
alter table subcontractors add column contract_value numeric(12, 2);
alter table subcontractors add column retention_percentage numeric(5, 2) default 5;
alter table subcontractors add column start_date date;
alter table subcontractors add column completion_date date;
alter table subcontractors add column retention_released_amount numeric(12, 2);
alter table subcontractors add column retention_released_date date;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------

create table subcontractor_quotes (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references subcontractors (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  description text not null,
  amount numeric(12, 2),
  status text not null default 'requested' check (status in ('requested', 'received', 'accepted', 'declined')),
  requested_date date not null default current_date,
  received_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table subcontractor_quotes enable row level security;

create policy "members can manage subcontractor quotes in their company" on subcontractor_quotes
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_subcontractor_quotes after insert or update or delete on subcontractor_quotes
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Progress payments TO subcontractors (distinct from payment_claims, which
-- are claims the head contractor makes TO the client/principal)
-- ---------------------------------------------------------------------------

create table subcontractor_payments (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references subcontractors (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  claim_number text,
  claim_date date not null default current_date,
  amount_claimed numeric(12, 2) not null,
  retention_held numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2),
  due_date date,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'paid', 'disputed')),
  paid_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table subcontractor_payments enable row level security;

create policy "members can manage subcontractor payments in their company" on subcontractor_payments
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_subcontractor_payments after insert or update or delete on subcontractor_payments
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Attribute a defect to the subcontractor responsible, optionally
-- ---------------------------------------------------------------------------

alter table defects add column subcontractor_id uuid references subcontractors (id) on delete set null;

-- ---------------------------------------------------------------------------
-- BIF Act supporting statement — since 1 Oct 2020, head contractors on
-- non-residential contracts must declare with each payment claim to the
-- principal that subbies have been paid (or disclose who hasn't and why).
-- ---------------------------------------------------------------------------

alter table payment_claims add column supporting_statement_provided boolean not null default false;
