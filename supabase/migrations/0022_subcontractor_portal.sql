-- CivFlow — subcontractor self-service portal.
--
-- Extends the same "shareable token link, no login needed" pattern used for
-- clients (variations, quotes, project portal) to subcontractors. Today a
-- subbie's insurance and licence expiry, their own progress claims, and
-- SWMS acknowledgment all have to be chased and re-entered by the builder.
-- A no-login /sub/<token> link lets the subcontractor keep their own
-- compliance info current (which then feeds Compliance Health — an
-- uninsured or unlicensed subbie on site is a real exposure for the
-- builder) and submit their own progress claims instead of phoning them in.
--
-- NOTE: every function parameter below is deliberately named differently
-- from the column it's compared against (sub_token, not portal_token) —
-- PL/pgSQL treats a bare identifier that matches both a parameter name and
-- a column name as ambiguous and errors at runtime, same reasoning as the
-- client_approval_token/variation_token split in 0017_variation_signoff.sql.

alter table subcontractors add column portal_token uuid not null default gen_random_uuid();
alter table subcontractors add constraint subcontractors_portal_token_key unique (portal_token);
comment on column subcontractors.portal_token is 'Used to build a no-login /sub/<token> link for the subcontractor to manage their own compliance info and claims.';

alter table swms add column acknowledged_at timestamptz;
comment on column swms.acknowledged_at is 'When the subcontractor themselves — via the /sub/<token> link — confirmed they''ve read this SWMS.';

-- Public read of a subcontractor's own portal data. No general SELECT
-- policy on subcontractors/swms/subcontractor_payments for anon — lookup
-- only happens through this function, same reasoning as
-- get_variation_by_token() in 0017_variation_signoff.sql.
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
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_subcontractor_portal_data(uuid) to anon, authenticated;

-- Lets the subcontractor keep their own compliance dates current. Only
-- touches insurance_expiry/licence_expiry — nothing else about the
-- subcontractor row (contract value, status, etc.) is reachable this way.
create or replace function public.update_subcontractor_compliance_by_token(
  sub_token uuid,
  new_insurance_expiry date,
  new_licence_expiry date
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
begin
  select * into s from subcontractors where portal_token = sub_token for update;

  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  update subcontractors
  set insurance_expiry = coalesce(new_insurance_expiry, insurance_expiry),
      licence_expiry = coalesce(new_licence_expiry, licence_expiry)
  where id = s.id;

  return jsonb_build_object('insurance_expiry', coalesce(new_insurance_expiry, s.insurance_expiry), 'licence_expiry', coalesce(new_licence_expiry, s.licence_expiry));
end;
$$;

grant execute on function public.update_subcontractor_compliance_by_token(uuid, date, date) to anon, authenticated;

-- Lets the subcontractor submit their own progress claim, landing as
-- 'submitted' — the builder still reviews/approves/pays it from inside
-- CivFlow exactly as if they'd entered it themselves.
create or replace function public.submit_subcontractor_claim_by_token(
  sub_token uuid,
  claim_amount numeric,
  claim_notes text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  new_claim subcontractor_payments%rowtype;
begin
  if claim_amount is null or claim_amount <= 0 then
    raise exception 'Claim amount must be greater than zero.';
  end if;

  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  insert into subcontractor_payments (subcontractor_id, project_id, amount_claimed, notes, status, claim_date)
  values (s.id, s.project_id, claim_amount, claim_notes, 'submitted', current_date)
  returning * into new_claim;

  return jsonb_build_object('id', new_claim.id, 'claim_date', new_claim.claim_date, 'amount_claimed', new_claim.amount_claimed);
end;
$$;

grant execute on function public.submit_subcontractor_claim_by_token(uuid, numeric, text) to anon, authenticated;

-- Idempotent — re-acknowledging is harmless, so this just no-ops if it's
-- already set rather than erroring (unlike variation approval, there's no
-- dispute-evidence reason to lock it to a single call).
create or replace function public.acknowledge_swms_by_token(sub_token uuid, target_swms_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  s subcontractors%rowtype;
  acknowledged timestamptz;
begin
  select * into s from subcontractors where portal_token = sub_token;
  if s.id is null then
    raise exception 'Subcontractor not found';
  end if;

  update swms
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = target_swms_id and subcontractor_id = s.id
  returning acknowledged_at into acknowledged;

  if acknowledged is null then
    raise exception 'SWMS not found for this subcontractor';
  end if;

  return jsonb_build_object('acknowledged_at', acknowledged);
end;
$$;

grant execute on function public.acknowledge_swms_by_token(uuid, uuid) to anon, authenticated;
