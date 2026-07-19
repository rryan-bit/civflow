-- CivFlow — field worker (crew) accounts.
--
-- A new 'field_worker' profile role for on-site labour ("the blokes") who
-- get a real login (invited the same way as any teammate) but a
-- deliberately narrow view: only the project(s) they're assigned to, read
-- only diary/safety info, their own logged hours, and two things they can
-- write themselves — a site photo and a question for the builder.
--
-- SECURITY MODEL: rather than hand-editing every existing table's RLS
-- policy to carve out an exception (error-prone — easy to miss one and
-- leave a real data leak), this migration adds ONE additional RESTRICTIVE
-- policy per table that blanket-denies field_workers entirely, driven off
-- an allowlist rather than a denylist. Postgres ANDs restrictive policies
-- on top of the existing permissive ones, so nothing about any other
-- role's access changes — a field_worker is simply blocked from every
-- table except the small set below, and gets read access to the rest
-- (diary entries, safety, their own hours) through purpose-built
-- SECURITY DEFINER functions instead, the same pattern already used for
-- the anonymous /portal, /vary, /quote, and /sub links.
--
-- CAVEAT: the blanket-deny loop only sweeps tables that exist at the time
-- this migration runs. Any table added by a LATER migration is NOT
-- automatically locked down for field_workers — a future migration that
-- adds a sensitive table should add its own
-- `as restrictive ... using (not public.is_field_worker())` policy.

-- ---------------------------------------------------------------------------
-- Role: widen the check constraints (found dynamically rather than assumed
-- by name, since Postgres' default auto-generated constraint name could in
-- principle differ).
-- ---------------------------------------------------------------------------

do $$
declare
  con text;
begin
  select conname into con from pg_constraint
  where conrelid = 'profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%';
  if con is not null then
    execute format('alter table profiles drop constraint %I', con);
  end if;
end $$;
alter table profiles add constraint profiles_role_check
  check (role in ('supervisor', 'project_manager', 'admin', 'field_worker'));

do $$
declare
  con text;
begin
  select conname into con from pg_constraint
  where conrelid = 'invites'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%';
  if con is not null then
    execute format('alter table invites drop constraint %I', con);
  end if;
end $$;
alter table invites add constraint invites_role_check
  check (role in ('supervisor', 'project_manager', 'admin', 'field_worker'));

alter table invites add column project_id uuid references projects (id) on delete set null;
comment on column invites.project_id is 'Only meaningful for role = field_worker: which project they land on after joining.';

create or replace function public.is_field_worker()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select role = 'field_worker' from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Which project(s) a field_worker is assigned to.
-- ---------------------------------------------------------------------------

create table project_workers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

alter table project_workers enable row level security;

create policy "members can manage project worker assignments in their company" on project_workers
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_project_workers after insert or update or delete on project_workers
  for each row execute function public.log_audit();

create or replace function public.my_assigned_project_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select project_id from project_workers where profile_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Link a no-login `workers` time-tracking record to an actual field_worker
-- login, so hours already logged against them show up on their own view.
-- ---------------------------------------------------------------------------

alter table workers add column linked_profile_id uuid references profiles (id) on delete set null;
comment on column workers.linked_profile_id is 'Links this labour-tracking record to a field_worker login account (see 0026_field_workers.sql).';

-- Field workers get read-only access to just their own linked worker
-- record and their own time entries — never another worker's, and never
-- write access (logging hours stays a supervisor/PM job).
create policy "field workers: read-only access to their own worker record" on workers
  as restrictive
  for all
  using (not public.is_field_worker() or linked_profile_id = auth.uid())
  with check (not public.is_field_worker());

create policy "field workers: read-only access to their own time entries" on worker_time_entries
  as restrictive
  for all
  using (
    not public.is_field_worker()
    or worker_id in (select id from workers where linked_profile_id = auth.uid())
  )
  with check (not public.is_field_worker());

-- ---------------------------------------------------------------------------
-- Site photos a crew member posts — deliberately its own table rather than
-- media_assets (which hangs off a diary entry and goes through the
-- supervisor-driven capture/approval flow); this is a lighter-weight "here's
-- what it looks like right now" feed anyone assigned to the project can add
-- to. Reuses the existing diary-media storage bucket (already readable/
-- writable by any authenticated user) under a worker-photos/ prefix — no
-- new storage bucket or policy needed since, unlike the subcontractor
-- portal, everyone touching this is a real logged-in user.
-- ---------------------------------------------------------------------------

create table worker_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  uploaded_by uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

alter table worker_photos enable row level security;

create policy "company members can view worker photos" on worker_photos
  for select using (
    project_id in (select id from projects where company_id = public.current_company_id())
    and (not public.is_field_worker() or project_id in (select public.my_assigned_project_ids()))
  );

create policy "members can upload worker photos" on worker_photos
  for insert with check (
    uploaded_by = auth.uid()
    and project_id in (select id from projects where company_id = public.current_company_id())
    and (not public.is_field_worker() or project_id in (select public.my_assigned_project_ids()))
  );

create policy "staff can edit worker photo captions" on worker_photos
  for update using (
    project_id in (select id from projects where company_id = public.current_company_id())
    and not public.is_field_worker()
  );

create policy "uploader or staff can delete worker photos" on worker_photos
  for delete using (
    project_id in (select id from projects where company_id = public.current_company_id())
    and (uploaded_by = auth.uid() or not public.is_field_worker())
  );

create trigger audit_worker_photos after insert or update or delete on worker_photos
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- A lightweight question feed — the "ask questions" side of the crew
-- portal. Deliberately not the AI chat: a crew member's question usually
-- needs a human answer from the builder (a decision, a clarification),
-- not a lookup against what's already logged.
-- ---------------------------------------------------------------------------

create table worker_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  asked_by uuid not null references profiles (id) on delete cascade,
  question text not null,
  answer text,
  answered_by uuid references profiles (id),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table worker_questions enable row level security;

create policy "company members can view worker questions" on worker_questions
  for select using (
    project_id in (select id from projects where company_id = public.current_company_id())
    and (not public.is_field_worker() or project_id in (select public.my_assigned_project_ids()))
  );

create policy "field workers can ask questions on their assigned projects" on worker_questions
  for insert with check (
    asked_by = auth.uid()
    and project_id in (select id from projects where company_id = public.current_company_id())
    and (not public.is_field_worker() or project_id in (select public.my_assigned_project_ids()))
  );

create policy "staff can answer worker questions" on worker_questions
  for update using (
    project_id in (select id from projects where company_id = public.current_company_id())
    and not public.is_field_worker()
  );

create trigger audit_worker_questions after insert or update or delete on worker_questions
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Blanket deny: every other table in the public schema is entirely off
-- limits to field_workers. See the CAVEAT note at the top of this file.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  allowed_tables text[] := array[
    'profiles', 'companies', 'project_workers', 'worker_photos', 'worker_questions',
    'workers', 'worker_time_entries'
  ];
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> all (allowed_tables)
  loop
    execute format(
      'create policy %I on %I as restrictive for all using (not public.is_field_worker())',
      'field_worker_blanket_deny',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Redeeming a field_worker invite also drops them straight into the
-- project the invite was generated for.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_invite(invite_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  inv invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv from invites where token = invite_token for update;

  if inv.id is null then
    raise exception 'Invite not found';
  end if;
  if inv.used_at is not null then
    raise exception 'This invite has already been used';
  end if;
  if inv.expires_at <= now() then
    raise exception 'This invite has expired';
  end if;

  update profiles
  set company_id = inv.company_id, role = inv.role
  where id = auth.uid();

  if inv.role = 'field_worker' and inv.project_id is not null then
    insert into project_workers (project_id, profile_id)
    values (inv.project_id, auth.uid())
    on conflict (project_id, profile_id) do nothing;
  end if;

  update invites
  set used_at = now(), used_by = auth.uid()
  where id = inv.id;

  return jsonb_build_object('company_id', inv.company_id, 'role', inv.role);
end;
$$;

-- ---------------------------------------------------------------------------
-- Field worker read functions — everything their /site view needs, all in
-- one or two calls, entirely bypassing the blanket-deny policies above
-- (SECURITY DEFINER) but scoped strictly to their own assignments.
-- ---------------------------------------------------------------------------

create or replace function public.get_field_worker_home()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'projects', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'site_address', p.site_address, 'status', p.status
    ) order by p.name), '[]'::jsonb)
  ) into result
  from project_workers pw
  join projects p on p.id = pw.project_id
  where pw.profile_id = auth.uid();

  return result;
end;
$$;

grant execute on function public.get_field_worker_home() to authenticated;

create or replace function public.get_field_worker_project_data(target_project_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  is_assigned boolean;
  proj record;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from project_workers where project_id = target_project_id and profile_id = auth.uid()
  ) into is_assigned;

  if not is_assigned then
    return jsonb_build_object('is_valid', false);
  end if;

  select id, name, site_address into proj from projects where id = target_project_id;

  select jsonb_build_object(
    'is_valid', true,
    'project_name', proj.name,
    'site_address', proj.site_address,

    'diary_entries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'entry_date', e.entry_date, 'status', e.status,
        'summary', e.summary, 'percent_complete', e.percent_complete
      ) order by e.entry_date desc), '[]'::jsonb)
      from (
        select de.id, de.entry_date, de.status, pn.summary, pn.percent_complete
        from diary_entries de
        left join progress_notes pn on pn.diary_entry_id = de.id
        where de.project_id = target_project_id
        order by de.entry_date desc
        limit 20
      ) e
    ),

    'safety_observations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'severity', s.severity, 'description', s.description,
        'action_taken', s.action_taken, 'entry_date', s.entry_date
      ) order by s.entry_date desc), '[]'::jsonb)
      from (
        select so.id, so.severity, so.description, so.action_taken, de.entry_date
        from safety_observations so
        join diary_entries de on de.id = so.diary_entry_id
        where de.project_id = target_project_id
        order by de.entry_date desc
        limit 20
      ) s
    ),

    'my_hours', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'work_date', h.work_date, 'hours', h.hours, 'notes', h.notes
      ) order by h.work_date desc), '[]'::jsonb)
      from (
        select wte.work_date, wte.hours, wte.notes
        from worker_time_entries wte
        join workers w on w.id = wte.worker_id
        where wte.project_id = target_project_id and w.linked_profile_id = auth.uid()
        order by wte.work_date desc
        limit 30
      ) h
    ),

    'my_total_hours', (
      select coalesce(sum(wte.hours), 0)
      from worker_time_entries wte
      join workers w on w.id = wte.worker_id
      where wte.project_id = target_project_id and w.linked_profile_id = auth.uid()
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_field_worker_project_data(uuid) to authenticated;
