-- CivFlow — Leads / quotes pipeline.
--
-- A pre-project stage so scope discussed at quoting time doesn't evaporate
-- the moment work starts and quietly become an unbilled variation later.
-- Company-wide (leads aren't tied to a project — they become one).

create table leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  client_name text not null,
  site_address text,
  description text,
  estimated_value numeric(12, 2),
  quote_amount numeric(12, 2),
  quote_sent_date date,
  follow_up_date date,
  status text not null default 'enquiry' check (status in ('enquiry', 'quoting', 'quote_sent', 'won', 'lost')),
  lost_reason text,
  converted_project_id uuid references projects (id) on delete set null,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

create policy "members can manage leads in their company" on leads
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create trigger audit_leads after insert or update or delete on leads
  for each row execute function public.log_audit();
