-- CivFlow — Team invite links
-- Run this after 0001_init.sql, in the Supabase SQL Editor.

create table invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  role text not null default 'supervisor' check (role in ('supervisor', 'project_manager', 'admin')),
  created_by uuid references profiles (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table invites enable row level security;

-- Only admins can create/view/revoke invites, and only for their own company.
-- (There's deliberately no general SELECT-by-token policy here — looking up
-- an invite by token happens through get_invite_preview() below instead, so
-- an invite's existence isn't broadly queryable.)
create policy "admins manage their company invites" on invites
  for all using (
    company_id = public.current_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    company_id = public.current_company_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Shown on the public /join/<token> page, even to a signed-out visitor,
-- so they can see "You've been invited to join Acme Civil" before signing up.
create or replace function public.get_invite_preview(invite_token text)
returns table (company_name text, role text, is_valid boolean)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select c.name, i.role, (i.used_at is null and i.expires_at > now())
    from invites i
    join companies c on c.id = i.company_id
    where i.token = invite_token;
end;
$$;

grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- Redeems an invite for the currently authenticated user. This is the ONLY
-- way a profile's company_id/role can change (see the column-privilege
-- revoke below) — it validates the invite is unused and unexpired, then
-- links the caller's own profile to that company at the invited role.
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

  update invites
  set used_at = now(), used_by = auth.uid()
  where id = inv.id;

  return jsonb_build_object('company_id', inv.company_id, 'role', inv.role);
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;

-- Hardening: the original "users can update their own profile" policy from
-- 0001_init.sql allows a user to update any column on their own row,
-- including company_id and role — meaning, as originally written, anyone
-- could self-assign themselves into any company by guessing/knowing its
-- UUID. Restrict direct column access so company_id/role can only change
-- through redeem_invite() above (which runs with elevated privileges and
-- enforces the invite is valid).
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;
