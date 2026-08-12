-- CivFlow — lead notes and follow-up log.
--
-- The leads/quotes pipeline (0015_leads.sql) has always had a single
-- `follow_up_date` column — good for "when's the next one due" but no
-- record of what's already happened: how many times someone's actually
-- followed up, or any running commentary on a lead as it develops. This is
-- the Pipedrive-style gap: two small append-only logs per lead.
--
-- Kept as two separate tables rather than one generic "activity" table so
-- each has an obvious, single-purpose meaning: lead_follow_ups is "I made
-- contact" (its count is the number that shows in the UI), lead_notes is
-- "here's some context," which isn't itself a contact event.

create table lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  body text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table lead_notes enable row level security;

create policy "members can manage notes on leads in their company" on lead_notes
  for all using (
    lead_id in (select id from leads where company_id = public.current_company_id())
  )
  with check (
    lead_id in (select id from leads where company_id = public.current_company_id())
  );

-- New table since 0026_field_workers.sql — not swept by that migration's
-- blanket-deny loop, so add the same restrictive deny explicitly per the
-- CAVEAT note in that file. Leads are pre-project commercial pipeline data
-- a field worker has no reason to see.
create policy "field workers cannot access lead notes" on lead_notes
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_lead_notes after insert or update or delete on lead_notes
  for each row execute function public.log_audit();

create table lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table lead_follow_ups enable row level security;

create policy "members can manage follow-ups on leads in their company" on lead_follow_ups
  for all using (
    lead_id in (select id from leads where company_id = public.current_company_id())
  )
  with check (
    lead_id in (select id from leads where company_id = public.current_company_id())
  );

create policy "field workers cannot access lead follow-ups" on lead_follow_ups
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_lead_follow_ups after insert or update or delete on lead_follow_ups
  for each row execute function public.log_audit();
