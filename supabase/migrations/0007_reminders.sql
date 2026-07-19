-- CivFlow — Custom reminders, plus the calendar view that aggregates them
-- alongside due dates already tracked elsewhere (RFIs, DTRs, payment
-- claims, SWMS reviews, milestones, inspections, defects, licence/MFR
-- expiries). The calendar itself is read-only application logic — only
-- this reminders table is new schema.

create table reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  title text not null,
  due_date date not null,
  notes text,
  completed boolean not null default false,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table reminders enable row level security;

create policy "members can manage reminders in their company" on reminders
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create trigger audit_reminders after insert or update or delete on reminders
  for each row execute function public.log_audit();
