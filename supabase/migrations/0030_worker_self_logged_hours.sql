-- CivFlow — field worker self-logged hours.
--
-- 0026_field_workers.sql deliberately made worker_time_entries read-only for
-- field workers ("logging hours stays a supervisor/PM job"). In practice a
-- crew member on-site is the one who actually knows their own hours, so this
-- adds a narrow write path: a SECURITY DEFINER RPC that lets a field worker
-- log time against themselves, on a project they're actually assigned to,
-- against their own linked `workers` record (auto-created on first use).
--
-- This does NOT touch the 0026 restrictive policies — field workers still
-- can't INSERT into worker_time_entries or workers directly. The RPC is the
-- only door in, same pattern as get_or_create_worker_project_chat_room.

create or replace function public.log_my_hours(
  target_project_id uuid,
  p_work_date date,
  p_hours numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  my_company_id uuid;
  my_worker_id uuid;
  my_name text;
  new_entry worker_time_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_hours is null or p_hours <= 0 or p_hours > 24 then
    raise exception 'Hours must be between 0 and 24';
  end if;

  if not exists (
    select 1 from project_workers where project_id = target_project_id and profile_id = auth.uid()
  ) then
    raise exception 'You are not assigned to this project';
  end if;

  select company_id, full_name into my_company_id, my_name from profiles where id = auth.uid();

  -- Find (or create, on first use) the worker record linked to this login.
  select id into my_worker_id from workers where linked_profile_id = auth.uid();

  if my_worker_id is null then
    insert into workers (company_id, name, linked_profile_id, created_by)
    values (my_company_id, coalesce(my_name, 'Field worker'), auth.uid(), auth.uid())
    returning id into my_worker_id;
  end if;

  insert into worker_time_entries (worker_id, project_id, work_date, hours, notes, created_by)
  values (my_worker_id, target_project_id, coalesce(p_work_date, current_date), p_hours, p_notes, auth.uid())
  returning * into new_entry;

  return jsonb_build_object(
    'id', new_entry.id,
    'work_date', new_entry.work_date,
    'hours', new_entry.hours,
    'notes', new_entry.notes
  );
end;
$$;

grant execute on function public.log_my_hours(uuid, date, numeric, text) to authenticated;

-- Let a field worker delete an entry they logged themselves today (fixing a
-- typo), but not touch anything a supervisor entered or anything from a
-- prior day — keeps the "logging hours is a supervisor job" trust boundary
-- mostly intact while allowing quick self-correction.

create or replace function public.delete_my_hours(entry_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  entry worker_time_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select wte.* into entry
  from worker_time_entries wte
  join workers w on w.id = wte.worker_id
  where wte.id = entry_id and w.linked_profile_id = auth.uid();

  if entry.id is null then
    raise exception 'Entry not found';
  end if;
  if entry.created_by <> auth.uid() then
    raise exception 'You can only remove hours you logged yourself';
  end if;
  if entry.work_date <> current_date then
    raise exception 'You can only remove hours logged today';
  end if;

  delete from worker_time_entries where id = entry_id;
end;
$$;

grant execute on function public.delete_my_hours(uuid) to authenticated;

-- Widen get_field_worker_project_data's my_hours entries with an id and a
-- can_remove flag (logged by me, today) so the /site UI can offer a Remove
-- action on entries the worker is actually allowed to delete themselves.

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
        'id', h.id, 'work_date', h.work_date, 'hours', h.hours, 'notes', h.notes,
        'can_remove', h.created_by = auth.uid() and h.work_date = current_date
      ) order by h.work_date desc), '[]'::jsonb)
      from (
        select wte.id, wte.work_date, wte.hours, wte.notes, wte.created_by
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
