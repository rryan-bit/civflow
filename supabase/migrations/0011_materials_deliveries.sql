-- CivFlow — Materials & deliveries tracking.
--
-- The most direct paper trail against "materials went missing": what was
-- ordered, when it's due, what actually turned up, and whether a delivery
-- came up short or damaged. Deliberately simple (no full inventory/stock
-- ledger) — this is a per-project order/delivery log, not a warehouse
-- management system.

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  description text not null,
  supplier text,
  quantity_ordered numeric,
  unit text,
  cost numeric(12, 2),
  ordered_date date default current_date,
  expected_date date,
  received_date date,
  quantity_received numeric,
  status text not null default 'ordered' check (status in ('ordered', 'delivered', 'short', 'damaged', 'cancelled')),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table materials enable row level security;

create policy "members can manage materials in their company" on materials
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_materials after insert or update or delete on materials
  for each row execute function public.log_audit();
