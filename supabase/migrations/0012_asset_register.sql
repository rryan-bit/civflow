-- CivFlow — Tool & plant register.
--
-- Company-wide (not per-project) since tools and hired plant move between
-- jobs. Two tables: the asset itself, and a checkout log so "who's got the
-- concrete saw and when's it due back" has an actual answer instead of a
-- guess. Keeping this as a simple current-checkout model (one open checkout
-- per asset at a time) rather than a full reservation/booking system.

create table assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  category text,
  ownership text not null default 'owned' check (ownership in ('owned', 'hired')),
  hire_company text,
  hire_cost_per_day numeric(10, 2),
  serial_number text,
  status text not null default 'available' check (status in ('available', 'checked_out', 'in_repair', 'retired')),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table assets enable row level security;

create policy "members can manage assets in their company" on assets
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create trigger audit_assets after insert or update or delete on assets
  for each row execute function public.log_audit();

create table asset_checkouts (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  checked_out_to text not null,
  checked_out_date date not null default current_date,
  due_back_date date,
  returned_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table asset_checkouts enable row level security;

create policy "members can manage asset checkouts in their company" on asset_checkouts
  for all using (asset_id in (select id from assets where company_id = public.current_company_id()))
  with check (asset_id in (select id from assets where company_id = public.current_company_id()));

create trigger audit_asset_checkouts after insert or update or delete on asset_checkouts
  for each row execute function public.log_audit();
