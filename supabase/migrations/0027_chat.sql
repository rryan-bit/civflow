-- CivFlow — team & project chat.
--
-- Two kinds of chat room: exactly one "team" room per company (implicit
-- membership — any staff member in the company can see and post, no
-- explicit participant list needed) and one "project" room per project
-- (explicit membership via chat_participants — staff self-join, then add
-- whoever else needs to be looped in, including subcontractors via their
-- existing no-login /sub/<token> link). Field workers are deliberately
-- left out of both for now — not requested, and it would widen their
-- otherwise narrow view (see 0026_field_workers.sql).

create table chat_rooms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  kind text not null check (kind in ('team', 'project')),
  created_at timestamptz not null default now(),
  constraint chat_rooms_project_requires_kind check (
    (kind = 'project' and project_id is not null) or (kind = 'team' and project_id is null)
  )
);

-- At most one team room per company, one room per project.
create unique index chat_rooms_one_team_per_company on chat_rooms (company_id) where kind = 'team';
create unique index chat_rooms_one_per_project on chat_rooms (project_id) where kind = 'project';

create table chat_participants (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid not null references chat_rooms (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade,
  subcontractor_id uuid references subcontractors (id) on delete cascade,
  added_at timestamptz not null default now(),
  constraint chat_participants_one_kind check (
    (profile_id is not null and subcontractor_id is null) or (profile_id is null and subcontractor_id is not null)
  ),
  unique (chat_room_id, profile_id),
  unique (chat_room_id, subcontractor_id)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid not null references chat_rooms (id) on delete cascade,
  sender_profile_id uuid references profiles (id) on delete set null,
  sender_subcontractor_id uuid references subcontractors (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_one_sender check (
    (sender_profile_id is not null and sender_subcontractor_id is null)
    or (sender_profile_id is null and sender_subcontractor_id is not null)
  )
);

alter table chat_rooms enable row level security;
alter table chat_participants enable row level security;
alter table chat_messages enable row level security;

-- SECURITY DEFINER so it can check chat_participants without that table's
-- own RLS recursing back through this function — a plain self-referencing
-- policy would work too, but this keeps every policy below a flat,
-- easy-to-read expression instead of nested subqueries three tables deep.
create or replace function public.is_chat_participant(target_chat_room_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from chat_participants
    where chat_room_id = target_chat_room_id and profile_id = auth.uid()
  );
$$;

create policy "staff can view chat rooms they belong to" on chat_rooms
  for select using (
    company_id = public.current_company_id()
    and not public.is_field_worker()
    and (kind = 'team' or public.is_chat_participant(id))
  );

create policy "staff can create chat rooms in their company" on chat_rooms
  for insert with check (
    company_id = public.current_company_id()
    and not public.is_field_worker()
  );

create policy "staff can view chat participants in their company" on chat_participants
  for select using (
    not public.is_field_worker()
    and chat_room_id in (select id from chat_rooms where company_id = public.current_company_id())
  );

-- Bootstrap-friendly: anyone on staff can add themselves to a project room
-- (consistent with the rest of the app — staff already see every project's
-- data, this is just "who's actively in the conversation"), which then lets
-- them add others, including a subcontractor.
create policy "staff can add chat participants" on chat_participants
  for insert with check (
    not public.is_field_worker()
    and chat_room_id in (select id from chat_rooms where company_id = public.current_company_id())
    and (
      profile_id = auth.uid()
      or chat_room_id in (select id from chat_rooms where kind = 'team')
      or public.is_chat_participant(chat_room_id)
    )
  );

create policy "staff can remove chat participants" on chat_participants
  for delete using (
    not public.is_field_worker()
    and (
      profile_id = auth.uid()
      or chat_room_id in (
        select id from chat_rooms
        where company_id = public.current_company_id() and (kind = 'team' or public.is_chat_participant(id))
      )
    )
  );

create policy "staff can view messages in rooms they belong to" on chat_messages
  for select using (
    chat_room_id in (
      select id from chat_rooms
      where company_id = public.current_company_id()
        and not public.is_field_worker()
        and (kind = 'team' or public.is_chat_participant(id))
    )
  );

create policy "staff can post messages in rooms they belong to" on chat_messages
  for insert with check (
    sender_profile_id = auth.uid()
    and chat_room_id in (
      select id from chat_rooms
      where company_id = public.current_company_id()
        and not public.is_field_worker()
        and (kind = 'team' or public.is_chat_participant(id))
    )
  );

create trigger audit_chat_rooms after insert or update or delete on chat_rooms
  for each row execute function public.log_audit();
create trigger audit_chat_messages after insert or update or delete on chat_messages
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Lazily find-or-create the team/project room, self-joining the caller to a
-- project room so they're not locked out immediately after creating it.
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_team_chat_room()
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
  if public.is_field_worker() then
    raise exception 'Not permitted';
  end if;

  select company_id into caller_company_id from profiles where id = auth.uid();
  if caller_company_id is null then
    raise exception 'No company assigned';
  end if;

  select id into room_id from chat_rooms where company_id = caller_company_id and kind = 'team';

  if room_id is null then
    insert into chat_rooms (company_id, kind) values (caller_company_id, 'team')
    on conflict (company_id) where kind = 'team' do nothing
    returning id into room_id;

    if room_id is null then
      select id into room_id from chat_rooms where company_id = caller_company_id and kind = 'team';
    end if;
  end if;

  return room_id;
end;
$$;

grant execute on function public.get_or_create_team_chat_room() to authenticated;

create or replace function public.get_or_create_project_chat_room(target_project_id uuid)
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
  if public.is_field_worker() then
    raise exception 'Not permitted';
  end if;

  select company_id into caller_company_id from profiles where id = auth.uid();
  if caller_company_id is null then
    raise exception 'No company assigned';
  end if;

  if not exists (select 1 from projects where id = target_project_id and company_id = caller_company_id) then
    raise exception 'Project not found';
  end if;

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

grant execute on function public.get_or_create_project_chat_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Subcontractor side — no auth.uid() at all, so read/post go through
-- token-checked SECURITY DEFINER functions exactly like quotes/updates in
-- 0025_subcontractor_uploads.sql, reusing its check_subcontractor_rate_limit().
-- ---------------------------------------------------------------------------

create or replace function public.get_subcontractor_chat_by_token(sub_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  room_id uuid;
  result jsonb;
begin
  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    return jsonb_build_object('is_participant', false);
  end if;

  select cr.id into room_id
  from chat_rooms cr
  join chat_participants cp on cp.chat_room_id = cr.id
  where cr.project_id = s.project_id and cr.kind = 'project' and cp.subcontractor_id = s.id;

  if room_id is null then
    return jsonb_build_object('is_participant', false);
  end if;

  select jsonb_build_object(
    'is_participant', true,
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'body', m.body, 'created_at', m.created_at,
        'sender_name', coalesce(p.full_name, sc.company_name, 'Someone'),
        'is_me', (m.sender_subcontractor_id = s.id)
      ) order by m.created_at asc), '[]'::jsonb)
      from chat_messages m
      left join profiles p on p.id = m.sender_profile_id
      left join subcontractors sc on sc.id = m.sender_subcontractor_id
      where m.chat_room_id = room_id
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_subcontractor_chat_by_token(uuid) to anon, authenticated;

create or replace function public.post_subcontractor_chat_message_by_token(sub_token uuid, message_body text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  room_id uuid;
  new_msg chat_messages%rowtype;
begin
  if message_body is null or length(trim(message_body)) = 0 then
    raise exception 'Message cannot be empty.';
  end if;

  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  if not public.check_subcontractor_rate_limit(s.id, 'post_chat_message', 60, 60) then
    raise exception 'Too many messages sent from this link recently — try again shortly.';
  end if;

  select cr.id into room_id
  from chat_rooms cr
  join chat_participants cp on cp.chat_room_id = cr.id
  where cr.project_id = s.project_id and cr.kind = 'project' and cp.subcontractor_id = s.id;

  if room_id is null then
    raise exception 'You are not part of this project''s chat.';
  end if;

  insert into chat_messages (chat_room_id, sender_subcontractor_id, body)
  values (room_id, s.id, trim(message_body))
  returning * into new_msg;

  return jsonb_build_object('id', new_msg.id, 'created_at', new_msg.created_at);
end;
$$;

grant execute on function public.post_subcontractor_chat_message_by_token(uuid, text) to anon, authenticated;
