-- CivFlow — subcontractor portal uploads.
--
-- Extends the /sub/<token> portal (0022_subcontractor_portal.sql) so a
-- subbie can submit a quote (with an attached file) and post a free-text
-- progress update (with an optional photo) from the same no-login link,
-- both of which then surface on the builder's project homepage without
-- anyone having to chase it by phone or email.
--
-- Same parameter-vs-column naming convention as 0022: every function
-- parameter that maps to a column is named differently from it
-- (sub_token vs portal_token) to avoid the PL/pgSQL ambiguous-identifier
-- bug.

-- ---------------------------------------------------------------------------
-- Quotes: let a portal submission carry an attached file and be flagged as
-- subcontractor-sourced (vs. the builder recording an amount over the phone).
-- ---------------------------------------------------------------------------

alter table subcontractor_quotes add column storage_path text;
alter table subcontractor_quotes add column submitted_via_portal boolean not null default false;
comment on column subcontractor_quotes.submitted_via_portal is 'True when the subcontractor submitted this themselves via /sub/<token>, rather than the builder recording it.';

-- ---------------------------------------------------------------------------
-- Free-text progress updates, optionally with a photo — a lighter-weight
-- alternative to a formal progress claim for "just letting you know" type
-- comms (delays, a stage finished, a heads-up).
-- ---------------------------------------------------------------------------

create table subcontractor_updates (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references subcontractors (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  message text not null,
  update_type text not null default 'general' check (update_type in ('general', 'delay_or_issue', 'stage_complete')),
  photo_storage_path text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references profiles (id)
);

alter table subcontractor_updates enable row level security;

create policy "members can view and acknowledge subcontractor updates in their company" on subcontractor_updates
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

create trigger audit_subcontractor_updates after insert or update or delete on subcontractor_updates
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Rate limiting for anonymous portal writes. The existing
-- check_ai_rate_limit() (0004_rate_limiting.sql) is keyed off auth.uid(),
-- which is null for anon portal requests — this is the same idea keyed off
-- the subcontractor instead. RLS is enabled with no policies at all, so the
-- table is only ever touched from inside the security-definer functions
-- below, never directly.
-- ---------------------------------------------------------------------------

create table portal_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references subcontractors (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

alter table portal_rate_limit_events enable row level security;

create or replace function public.check_subcontractor_rate_limit(
  target_subcontractor_id uuid,
  p_route text,
  p_limit integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from portal_rate_limit_events
  where subcontractor_id = target_subcontractor_id
    and route = p_route
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if current_count >= p_limit then
    return false;
  end if;

  insert into portal_rate_limit_events (subcontractor_id, route) values (target_subcontractor_id, p_route);
  return true;
end;
$$;

-- Not granted to anon/authenticated directly — only called internally by
-- the submit functions below, which already run as the function owner.

-- ---------------------------------------------------------------------------
-- Storage: a public bucket (like company-logos — no signed-URL plumbing
-- needed) but writes are locked to a path whose first folder segment is a
-- real subcontractor portal_token, checked via a security-definer helper
-- since the storage RLS policy itself can't see past subcontractors' own
-- RLS (which anon has no access to).
-- ---------------------------------------------------------------------------

create or replace function public.is_valid_subcontractor_token(token_text text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from subcontractors where portal_token::text = token_text);
$$;

grant execute on function public.is_valid_subcontractor_token(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('subcontractor-uploads', 'subcontractor-uploads', true)
on conflict (id) do nothing;

create policy "valid subcontractor token can upload their own files"
  on storage.objects for insert
  with check (
    bucket_id = 'subcontractor-uploads'
    and public.is_valid_subcontractor_token((storage.foldername(name))[1])
  );

create policy "anyone can view subcontractor uploads"
  on storage.objects for select
  using (bucket_id = 'subcontractor-uploads');

-- ---------------------------------------------------------------------------
-- Submit a quote — either responding to one the builder requested
-- (target_quote_id set, must belong to this subcontractor and still be
-- 'requested') or an unsolicited new one (target_quote_id null).
-- ---------------------------------------------------------------------------

create or replace function public.submit_subcontractor_quote_by_token(
  sub_token uuid,
  target_quote_id uuid,
  quote_description text,
  quoted_amount numeric,
  quote_notes text,
  quote_storage_path text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  q subcontractor_quotes%rowtype;
begin
  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  if not public.check_subcontractor_rate_limit(s.id, 'submit_quote', 20, 60) then
    raise exception 'Too many quote submissions from this link recently — try again shortly.';
  end if;

  if target_quote_id is not null then
    update subcontractor_quotes
    set description = coalesce(quote_description, description),
        amount = coalesce(quoted_amount, amount),
        notes = coalesce(quote_notes, notes),
        storage_path = coalesce(quote_storage_path, storage_path),
        status = 'received',
        received_date = current_date,
        submitted_via_portal = true
    where id = target_quote_id and subcontractor_id = s.id and status = 'requested'
    returning * into q;

    if q.id is null then
      raise exception 'That quote request was not found, or has already been responded to.';
    end if;
  else
    insert into subcontractor_quotes (
      subcontractor_id, project_id, description, amount, notes, storage_path,
      status, requested_date, received_date, submitted_via_portal
    )
    values (
      s.id, s.project_id, coalesce(quote_description, 'Quote submitted via subcontractor portal'),
      quoted_amount, quote_notes, quote_storage_path,
      'received', current_date, current_date, true
    )
    returning * into q;
  end if;

  return jsonb_build_object('id', q.id, 'status', q.status, 'amount', q.amount);
end;
$$;

grant execute on function public.submit_subcontractor_quote_by_token(uuid, uuid, text, numeric, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Post a free-text progress update, optionally with a photo.
-- ---------------------------------------------------------------------------

create or replace function public.submit_subcontractor_update_by_token(
  sub_token uuid,
  update_message text,
  update_kind text,
  update_photo_path text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  u subcontractor_updates%rowtype;
begin
  if update_message is null or length(trim(update_message)) = 0 then
    raise exception 'Update message cannot be empty.';
  end if;

  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  if not public.check_subcontractor_rate_limit(s.id, 'submit_update', 30, 60) then
    raise exception 'Too many updates posted from this link recently — try again shortly.';
  end if;

  insert into subcontractor_updates (subcontractor_id, project_id, message, update_type, photo_storage_path)
  values (s.id, s.project_id, trim(update_message), coalesce(update_kind, 'general'), update_photo_path)
  returning * into u;

  return jsonb_build_object('id', u.id, 'created_at', u.created_at);
end;
$$;

grant execute on function public.submit_subcontractor_update_by_token(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Extend the portal read function with quotes (so the subbie can see what's
-- been requested of them and what they've already sent) and updates
-- (their own recent history).
-- ---------------------------------------------------------------------------

create or replace function public.get_subcontractor_portal_data(sub_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  sub record;
  result jsonb;
begin
  select s.id, s.company_name, s.trade, s.status, s.contract_value, s.start_date, s.completion_date,
         s.insurance_expiry, s.licence_expiry, s.retention_percentage, s.retention_released_amount,
         s.retention_released_date, p.id as project_id, p.name as project_name, p.site_address,
         c.name as builder_company_name
  into sub
  from subcontractors s
  join projects p on p.id = s.project_id
  join companies c on c.id = p.company_id
  where s.portal_token = sub_token;

  if sub.id is null then
    return jsonb_build_object('is_valid', false);
  end if;

  select jsonb_build_object(
    'is_valid', true,
    'builder_company_name', sub.builder_company_name,
    'project_name', sub.project_name,
    'site_address', sub.site_address,
    'company_name', sub.company_name,
    'trade', sub.trade,
    'status', sub.status,
    'contract_value', sub.contract_value,
    'start_date', sub.start_date,
    'completion_date', sub.completion_date,
    'insurance_expiry', sub.insurance_expiry,
    'licence_expiry', sub.licence_expiry,
    'retention_percentage', sub.retention_percentage,
    'retention_released_amount', sub.retention_released_amount,
    'retention_released_date', sub.retention_released_date,

    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', sp.id, 'claim_number', sp.claim_number, 'claim_date', sp.claim_date,
        'amount_claimed', sp.amount_claimed, 'status', sp.status,
        'amount_paid', sp.amount_paid, 'paid_date', sp.paid_date
      ) order by sp.claim_date desc), '[]'::jsonb)
      from subcontractor_payments sp
      where sp.subcontractor_id = sub.id
    ),

    'swms', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', w.id, 'title', w.title, 'status', w.status, 'review_due_date', w.review_due_date,
        'acknowledged_at', w.acknowledged_at
      ) order by w.created_at desc), '[]'::jsonb)
      from swms w
      where w.subcontractor_id = sub.id
    ),

    'quotes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'description', q.description, 'amount', q.amount, 'status', q.status,
        'requested_date', q.requested_date, 'received_date', q.received_date,
        'notes', q.notes, 'storage_path', q.storage_path
      ) order by q.created_at desc), '[]'::jsonb)
      from subcontractor_quotes q
      where q.subcontractor_id = sub.id
    ),

    'updates', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', recent.id, 'message', recent.message, 'update_type', recent.update_type,
        'photo_storage_path', recent.photo_storage_path, 'created_at', recent.created_at
      ) order by recent.created_at desc), '[]'::jsonb)
      from (
        select u.id, u.message, u.update_type, u.photo_storage_path, u.created_at
        from subcontractor_updates u
        where u.subcontractor_id = sub.id
        order by u.created_at desc
        limit 10
      ) recent
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_subcontractor_portal_data(uuid) to anon, authenticated;
