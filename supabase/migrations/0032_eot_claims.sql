-- CivFlow — Extension of Time (EOT) claims.
--
-- The QLD/HIA regulatory gap the day-to-day coverage review flagged:
-- CivFlow already captures the evidence that supports an EOT claim
-- (weather_logs, milestones.delay_reason) but had no purpose-built place to
-- track the actual claim itself. Under a standard HIA/QBCC domestic
-- building contract, a builder who wants to claim extra time for a delay
-- (weather, latent conditions, a client-caused delay, etc.) generally has
-- to give the client written notice within a set window of becoming aware
-- of the cause and extent of the delay — commonly 10 business days — or
-- risk losing the right to claim it. This is that missing deadline
-- tracker + notice register.
--
-- Deliberately NOT another client-facing token-approval flow like
-- variations/selections: an EOT notice is a builder-to-client notification
-- the contract requires the builder to send, not something that needs the
-- client to click "approve" inside CivFlow. The register tracks whether
-- the notice went out before the deadline (the thing that actually matters
-- if it's ever disputed) and gives the builder a printable notice to send.

create table eot_claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  milestone_id uuid references milestones (id) on delete set null,
  title text not null,
  cause text not null check (cause in ('weather', 'latent_conditions', 'client_variation', 'subcontractor_delay', 'authority_delay', 'other')),
  description text,
  date_became_aware date not null default current_date,
  days_claimed integer,
  notice_due_date date not null,
  notice_sent_at timestamptz,
  notice_sent_note text,
  status text not null default 'open' check (status in ('open', 'notice_sent', 'granted', 'rejected')),
  client_response_note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

comment on column eot_claims.date_became_aware is 'When the builder first knew the cause and likely extent of the delay — this is what the notice deadline is measured from, not when the delay itself started.';
comment on column eot_claims.notice_due_date is 'Deadline to give the client written notice (commonly 10 business days from date_became_aware under a standard HIA/QBCC contract — check the actual contract, this varies). Computed client-side at creation, editable if the contract specifies something different.';
comment on column eot_claims.notice_sent_at is 'When the builder actually sent the notice — the evidence that matters if the extension is ever disputed. Distinct from notice_due_date (the deadline) and status (the internal tracking state).';
comment on column eot_claims.status is 'open: notice not sent yet. notice_sent: notice sent, awaiting the client''s response. granted/rejected: how the client (or a later adjudication) resolved it.';

alter table eot_claims enable row level security;

create policy "members can manage eot claims in their company" on eot_claims
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

-- New table since 0026_field_workers.sql — add the explicit deny per the
-- CAVEAT note in that file, same reasoning as selections in 0031.
create policy "field workers cannot access eot claims" on eot_claims
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_eot_claims after insert or update or delete on eot_claims
  for each row execute function public.log_audit();
