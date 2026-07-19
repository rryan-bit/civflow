-- CivFlow — dependency-aware scheduling (critical path).
--
-- The other confirmed gap from the day-to-day coverage review: milestones
-- were a flat list of target dates with no sequencing — no way to say
-- "framing can't start until the slab's poured," and no way to see which
-- milestone is actually driving the finish date versus which ones have
-- slack. This adds a duration to each milestone and a predecessor/
-- successor dependency graph between them; the critical-path math itself
-- lives in src/lib/schedule-calcs.ts (a pure, unit-tested CPM
-- implementation) rather than in SQL, computed on read.

alter table milestones add column duration_days integer not null default 1 check (duration_days > 0);

comment on column milestones.duration_days is 'How many days this milestone''s work takes — used with milestone_dependencies to compute an earliest/latest schedule and critical path. Defaults to 1 (a point-in-time milestone) for anything not explicitly sequenced.';

create table milestone_dependencies (
  id uuid primary key default gen_random_uuid(),
  predecessor_id uuid not null references milestones (id) on delete cascade,
  successor_id uuid not null references milestones (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint milestone_dependencies_no_self_reference check (predecessor_id <> successor_id),
  constraint milestone_dependencies_unique unique (predecessor_id, successor_id)
);

comment on table milestone_dependencies is 'predecessor must finish before successor can start. Cycle prevention is enforced in the app layer (src/lib/schedule-calcs.ts wouldCreateCycle) before a row is ever inserted, not in the database — Postgres has no built-in DAG constraint.';

alter table milestone_dependencies enable row level security;

create policy "members can manage milestone dependencies in their company" on milestone_dependencies
  for all using (
    predecessor_id in (
      select m.id from milestones m
      join projects p on p.id = m.project_id
      where p.company_id = public.current_company_id()
    )
  )
  with check (
    predecessor_id in (
      select m.id from milestones m
      join projects p on p.id = m.project_id
      where p.company_id = public.current_company_id()
    )
    and successor_id in (
      select m.id from milestones m
      join projects p on p.id = m.project_id
      where p.company_id = public.current_company_id()
    )
  );

-- New table since 0026_field_workers.sql — add the explicit deny per the
-- CAVEAT note in that file, same reasoning as selections/eot_claims.
create policy "field workers cannot access milestone dependencies" on milestone_dependencies
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_milestone_dependencies after insert or update or delete on milestone_dependencies
  for each row execute function public.log_audit();
