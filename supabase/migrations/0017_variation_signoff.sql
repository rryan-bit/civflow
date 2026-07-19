-- CivFlow — variation client sign-off.
--
-- The single biggest cause of variation disputes on small residential jobs:
-- a builder does extra work at the client's request, and "approved" in the
-- app has only ever meant a staff member clicked a button — there was never
-- an actual record of the CLIENT agreeing to the scope and cost before work
-- proceeded. Under the Domestic Building Contracts Act 2000 (QLD), a
-- variation to a regulated contract generally has to be in writing (stating
-- the change, the price/time impact, and — if the builder asked for it —
-- why) before the builder can safely recover its cost. This migration adds
-- that missing written record, using the same "shareable token link, no
-- login needed" pattern as the existing team invite links.

alter table variations add column requested_by_type text check (requested_by_type in ('client', 'builder'));
alter table variations add column reason text;
alter table variations add column client_name text;
alter table variations add column client_approval_token uuid not null default gen_random_uuid();
alter table variations add column client_approved_at timestamptz;
alter table variations add column client_approved_name text;
alter table variations add column work_started boolean not null default false;
alter table variations add column work_started_date date;

alter table variations add constraint variations_client_approval_token_key unique (client_approval_token);

comment on column variations.requested_by_type is 'Who asked for this change — the client (building owner) or the builder. The Act requires stating a reason when the builder initiates it.';
comment on column variations.client_approval_token is 'Used to build a no-login /vary/<token> link the builder can text/email the client for sign-off.';
comment on column variations.client_approved_at is 'When the client themselves — via the /vary/<token> link — acknowledged the scope and cost. This is the actual evidence in a dispute, distinct from an internal staff "approved" status.';
comment on column variations.work_started is 'Whether work on this variation has actually started on site. Used to flag the risky case of work proceeding with no documented client approval yet.';

-- Public read of a single variation by its token, for the no-login
-- /vary/<token> page. Deliberately no general SELECT policy on variations
-- for anon — lookup only happens through this function, same reasoning as
-- get_invite_preview() in 0002_invites.sql.
create or replace function public.get_variation_by_token(variation_token uuid)
returns table (
  project_name text,
  company_name text,
  title text,
  description text,
  cost_impact numeric,
  time_impact_days integer,
  requested_by_type text,
  reason text,
  client_approved_at timestamptz,
  client_approved_name text,
  is_valid boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select p.name, c.name, v.title, v.description, v.cost_impact, v.time_impact_days,
           v.requested_by_type, v.reason, v.client_approved_at, v.client_approved_name,
           true
    from variations v
    join projects p on p.id = v.project_id
    join companies c on c.id = p.company_id
    where v.client_approval_token = variation_token;
end;
$$;

grant execute on function public.get_variation_by_token(uuid) to anon, authenticated;

-- Records the client's own acknowledgment. Anyone with the link can call
-- this (that's the point — the client has no CivFlow account), but it can
-- only ever set client_approved_at once; it doesn't let them change the
-- scope/cost, only confirm they've seen it.
create or replace function public.approve_variation_by_token(variation_token uuid, approver_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v variations%rowtype;
begin
  if approver_name is null or length(trim(approver_name)) = 0 then
    raise exception 'A name is required to approve.';
  end if;

  select * into v from variations where client_approval_token = variation_token for update;

  if v.id is null then
    raise exception 'Variation not found';
  end if;
  if v.client_approved_at is not null then
    raise exception 'This variation has already been approved';
  end if;

  update variations
  set client_approved_at = now(),
      client_approved_name = trim(approver_name),
      status = case when status in ('draft', 'submitted') then 'approved' else status end
  where id = v.id;

  return jsonb_build_object('approved_at', now(), 'approved_name', trim(approver_name));
end;
$$;

grant execute on function public.approve_variation_by_token(uuid, text) to anon, authenticated;
