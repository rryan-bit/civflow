-- CivFlow — Operations modules: RFIs, Variations, Milestones, audit trail,
-- and richer AI extraction fields.
-- Run this after 0001_init.sql and 0002_invites.sql.

-- ---------------------------------------------------------------------------
-- RFIs
-- ---------------------------------------------------------------------------

create table rfis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  subject text not null,
  question text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  raised_by uuid references profiles (id),
  assigned_to uuid references profiles (id),
  due_date date,
  answer text,
  answered_by uuid references profiles (id),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table rfis enable row level security;

create policy "members can manage rfis in their company" on rfis
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

-- ---------------------------------------------------------------------------
-- Variations
-- ---------------------------------------------------------------------------

create table variations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  cost_impact numeric,
  time_impact_days integer,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  raised_by uuid references profiles (id),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table variations enable row level security;

create policy "members can manage variations in their company" on variations
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

-- ---------------------------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------------------------

create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  target_date date,
  status text not null default 'pending' check (status in ('pending', 'on_track', 'at_risk', 'delayed', 'complete')),
  notes text,
  created_at timestamptz not null default now()
);

alter table milestones enable row level security;

create policy "members can manage milestones in their company" on milestones
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

-- ---------------------------------------------------------------------------
-- Richer AI extraction: delays, missing info, and outstanding actions
-- surfaced by the model alongside the existing progress summary.
-- ---------------------------------------------------------------------------

alter table progress_notes add column delays text[];
alter table progress_notes add column missing_information text[];
alter table progress_notes add column outstanding_actions text[];

-- ---------------------------------------------------------------------------
-- Audit trail: a generic trigger that logs every insert/update/delete on the
-- tables that matter most, so nothing needs to remember to log itself.
-- ---------------------------------------------------------------------------

create or replace function public.log_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if (tg_op = 'INSERT') then
    insert into audit_log (entity_table, entity_id, action, actor_id, metadata)
    values (tg_table_name, new.id, 'created', actor, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into audit_log (entity_table, entity_id, action, actor_id, metadata)
    values (tg_table_name, new.id, 'updated', actor, jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into audit_log (entity_table, entity_id, action, actor_id, metadata)
    values (tg_table_name, old.id, 'deleted', actor, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger audit_diary_entries after insert or update or delete on diary_entries
  for each row execute function public.log_audit();

create trigger audit_projects after insert or update or delete on projects
  for each row execute function public.log_audit();

create trigger audit_rfis after insert or update or delete on rfis
  for each row execute function public.log_audit();

create trigger audit_variations after insert or update or delete on variations
  for each row execute function public.log_audit();
