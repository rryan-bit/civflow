-- CivFlow — group chats, and letting field workers into chat.
--
-- Two changes to the 0027 chat system:
--
-- 1. A third chat_rooms.kind, 'group' — a named, freeform chat that anyone
--    (staff or a field worker) can start and pick specific people for,
--    alongside the existing implicit Team chat and the one-per-project auto
--    chat. Optionally tied to a project (project_id set) or not.
--
-- 2. Field workers can now see and post in chat — but only project-scoped
--    chat (the auto project room, or a group room tied to one of their
--    assigned projects), never the company-wide Team chat, and only for
--    rooms they've actually been made a participant of. All of their
--    room/participant creation goes through SECURITY DEFINER RPCs rather
--    than direct table policies (get_or_create_worker_project_chat_room,
--    create_group_chat) — same pattern as the rest of the field_worker
--    surface — so the RLS policies below only ever need to reason about
--    reading and posting messages, not the trickier "who can create a room
--    with whom" logic.

alter table chat_rooms
  drop constraint chat_rooms_project_requires_kind,
  add constraint chat_rooms_project_requires_kind check (
    (kind = 'team' and project_id is null)
    or (kind = 'project' and project_id is not null)
    or (kind = 'group')
  );

alter table chat_rooms drop constraint chat_rooms_kind_check;
alter table chat_rooms add constraint chat_rooms_kind_check check (kind in ('team', 'project', 'group'));

alter table chat_rooms add column name text;
alter table chat_rooms add column created_by uuid references profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Single source of truth for "can this person see this room", covering both
-- staff (company-wide, minus needing to actually be a participant of
-- non-team rooms) and field workers (project-scoped, and must actually be a
-- participant — no auto-visibility into every group chat on their project).
-- ---------------------------------------------------------------------------

create or replace function public.can_view_chat_room(target_chat_room_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from chat_rooms cr
    where cr.id = target_chat_room_id
    and (
      (
        not public.is_field_worker()
        and cr.company_id = public.current_company_id()
        and (cr.kind = 'team' or public.is_chat_participant(cr.id))
      )
      or
      (
        public.is_field_worker()
        and cr.kind in ('project', 'group')
        and cr.project_id is not null
        and cr.project_id in (select public.my_assigned_project_ids())
        and public.is_chat_participant(cr.id)
      )
    )
  );
$$;

drop policy "staff can view chat rooms they belong to" on chat_rooms;
create policy "can view chat rooms" on chat_rooms
  for select using (public.can_view_chat_room(id));

drop policy "staff can view chat participants in their company" on chat_participants;
create policy "can view chat participants of visible rooms" on chat_participants
  for select using (public.can_view_chat_room(chat_room_id));

drop policy "staff can add chat participants" on chat_participants;
create policy "staff can add chat participants" on chat_participants
  for insert with check (
    not public.is_field_worker()
    and chat_room_id in (select id from chat_rooms where company_id = public.current_company_id())
    and (profile_id = auth.uid() or public.is_chat_participant(chat_room_id))
  );

drop policy "staff can remove chat participants" on chat_participants;
create policy "can remove chat participants" on chat_participants
  for delete using (
    profile_id = auth.uid()
    or (
      not public.is_field_worker()
      and chat_room_id in (
        select id from chat_rooms
        where company_id = public.current_company_id() and (kind = 'team' or public.is_chat_participant(id))
      )
    )
  );

drop policy "staff can view messages in rooms they belong to" on chat_messages;
create policy "can view messages in visible rooms" on chat_messages
  for select using (public.can_view_chat_room(chat_room_id));

drop policy "staff can post messages in rooms they belong to" on chat_messages;
create policy "can post messages in visible rooms" on chat_messages
  for insert with check (
    sender_profile_id = auth.uid()
    and public.can_view_chat_room(chat_room_id)
  );

-- ---------------------------------------------------------------------------
-- Field worker self-join into their project's auto chat room — mirrors
-- get_or_create_project_chat_room() but for the field_worker role, and
-- shares the exact same underlying room so workers and staff end up in one
-- conversation per project rather than two separate silos.
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_worker_project_chat_room(target_project_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  room_id uuid;
  caller_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_field_worker() then
    raise exception 'Not permitted';
  end if;
  if target_project_id not in (select public.my_assigned_project_ids()) then
    raise exception 'Not assigned to this project';
  end if;

  select company_id into caller_company_id from profiles where id = auth.uid();

  select id into room_id from chat_rooms where project_id = target_project_id and kind = 'project';

  if room_id is null then
    insert into chat_rooms (company_id, project_id, kind) values (caller_company_id, target_project_id, 'project')
    on conflict (project_id) where kind = 'project' do nothing
    returning id into room_id;

    if room_id is null then
      select id into room_id from chat_rooms where project_id = target_project_id and kind = 'project';
    end if;
  end if;

  insert into chat_participants (chat_room_id, profile_id)
  values (room_id, auth.uid())
  on conflict (chat_room_id, profile_id) do nothing;

  return room_id;
end;
$$;

grant execute on function public.get_or_create_worker_project_chat_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Named group chat, usable by staff (any project, or none) and field
-- workers (must supply one of their own assigned projects). Validates every
-- requested member so a caller can't loop in someone who has no business
-- being there — a field worker can only add other field workers assigned to
-- the same project, or any staff member; staff can add any company staff,
-- or a field worker assigned to the room's project.
-- ---------------------------------------------------------------------------

create or replace function public.create_group_chat(chat_name text, target_project_id uuid, member_profile_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  room_id uuid;
  caller_company_id uuid;
  caller_is_worker boolean;
  member_id uuid;
  member_role text;
  member_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if chat_name is null or length(trim(chat_name)) = 0 then
    raise exception 'Give the chat a name.';
  end if;

  select company_id into caller_company_id from profiles where id = auth.uid();
  if caller_company_id is null then
    raise exception 'No company assigned';
  end if;

  caller_is_worker := public.is_field_worker();

  if caller_is_worker then
    if target_project_id is null or target_project_id not in (select public.my_assigned_project_ids()) then
      raise exception 'Not assigned to this project';
    end if;
  elsif target_project_id is not null then
    if not exists (select 1 from projects where id = target_project_id and company_id = caller_company_id) then
      raise exception 'Project not found';
    end if;
  end if;

  insert into chat_rooms (company_id, project_id, kind, name, created_by)
  values (caller_company_id, target_project_id, 'group', trim(chat_name), auth.uid())
  returning id into room_id;

  insert into chat_participants (chat_room_id, profile_id) values (room_id, auth.uid());

  foreach member_id in array coalesce(member_profile_ids, array[]::uuid[])
  loop
    if member_id = auth.uid() then
      continue;
    end if;

    select role, company_id into member_role, member_company_id from profiles where id = member_id;

    if member_role is null or member_company_id is distinct from caller_company_id then
      continue;
    end if;

    if member_role = 'field_worker' then
      if target_project_id is null or not exists (
        select 1 from project_workers where profile_id = member_id and project_id = target_project_id
      ) then
        continue;
      end if;
    end if;

    insert into chat_participants (chat_room_id, profile_id)
    values (room_id, member_id)
    on conflict (chat_room_id, profile_id) do nothing;
  end loop;

  return room_id;
end;
$$;

grant execute on function public.create_group_chat(text, uuid, uuid[]) to authenticated;
