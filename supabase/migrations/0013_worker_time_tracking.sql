-- CivFlow — Named-worker time tracking.
--
-- labor_records (0001_init.sql) is a per-diary-entry headcount estimate
-- ("3 carpenters, 6 hours") extracted by AI from the site diary — useful
-- for the daily narrative, but it can't answer "who actually worked this
-- week" for wages or checking a sub's invoice. This adds actual named
-- workers (no login needed — casual labour, the owner's own crew, whoever)
-- and per-day hours logged against a project.

create table workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  trade text,
  hourly_rate numeric(8, 2),
  active boolean not null default true,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table workers enable row level security;

create policy "members can manage workers in their company" on workers
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create trigger audit_workers after insert or update or delete on workers
  for each row execute function public.log_audit();

create table worker_time_entries (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  work_date date not null default current_date,
  hours numeric(5, 2) not null,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table worker_time_entries enable row level security;

create policy "members can manage worker time entries in their company" on worker_time_entries
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_worker_time_entries after insert or update or delete on worker_time_entries
  for each row execute function public.log_audit();
