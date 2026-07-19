-- CivFlow — client selections & allowances.
--
-- The near-daily interaction on any custom/semi-custom residential job that
-- CivFlow had no record of at all: the client picking tapware, tiles, paint
-- colours, fixtures — usually against a budget "allowance" set in the
-- contract — with the builder needing a documented choice (not a text
-- message or a verbal "yeah I like the grey one") before ordering, and a
-- clear picture of whether the choice is running over or under the
-- allowance for job costing.
--
-- Reuses the exact same no-login "shareable token link" pattern as
-- variations (0017) and the client portal (0019): a selection gets its own
-- client_approval_token, the client opens /select/<token>, picks one of the
-- options the builder has entered, and types their name to confirm — that
-- confirmation is the record, same evidentiary role as a variation
-- approval.

create table selections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  category text not null,
  description text,
  allowance_amount numeric(10, 2),
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'awaiting_choice', 'chosen')),
  client_approval_token uuid not null default gen_random_uuid(),
  chosen_option_id uuid,
  client_chosen_at timestamptz,
  client_chosen_name text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table selections add constraint selections_client_approval_token_key unique (client_approval_token);

comment on column selections.allowance_amount is 'Budget set aside for this selection (e.g. a "$3,000 tapware allowance" in the contract). Compared against the chosen option''s cost to show a variance in Financials.';
comment on column selections.client_approval_token is 'Used to build a no-login /select/<token> link for the client to view options and choose.';
comment on column selections.status is 'draft: builder still adding options. awaiting_choice: sent, waiting on the client. chosen: client has picked an option.';

alter table selections enable row level security;

create policy "members can manage selections in their company" on selections
  for all using (project_id in (select id from projects where company_id = public.current_company_id()))
  with check (project_id in (select id from projects where company_id = public.current_company_id()));

-- New table since 0026_field_workers.sql — not swept by that migration's
-- blanket-deny loop, so add the same restrictive deny explicitly per the
-- CAVEAT note in that file. Selections are a client/builder conversation;
-- a field worker has no reason to see budget allowances.
create policy "field workers cannot access selections" on selections
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_selections after insert or update or delete on selections
  for each row execute function public.log_audit();

create table selection_options (
  id uuid primary key default gen_random_uuid(),
  selection_id uuid not null references selections (id) on delete cascade,
  name text not null,
  description text,
  cost numeric(10, 2),
  supplier text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table selections add constraint selections_chosen_option_id_fkey
  foreign key (chosen_option_id) references selection_options (id) on delete set null;

alter table selection_options enable row level security;

create policy "members can manage selection options in their company" on selection_options
  for all using (
    selection_id in (
      select s.id from selections s
      join projects p on p.id = s.project_id
      where p.company_id = public.current_company_id()
    )
  )
  with check (
    selection_id in (
      select s.id from selections s
      join projects p on p.id = s.project_id
      where p.company_id = public.current_company_id()
    )
  );

create policy "field workers cannot access selection options" on selection_options
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_selection_options after insert or update or delete on selection_options
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Public no-login access, same shape as get_variation_by_token /
-- approve_variation_by_token in 0017_variation_signoff.sql.
-- ---------------------------------------------------------------------------

create or replace function public.get_selection_by_token(selection_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  sel record;
  result jsonb;
begin
  select s.id, s.category, s.description, s.allowance_amount, s.due_date, s.status,
         s.chosen_option_id, s.client_chosen_at, s.client_chosen_name,
         p.name as project_name, c.name as company_name
  into sel
  from selections s
  join projects p on p.id = s.project_id
  join companies c on c.id = p.company_id
  where s.client_approval_token = selection_token;

  if sel.id is null then
    return jsonb_build_object('is_valid', false);
  end if;

  select jsonb_build_object(
    'is_valid', true,
    'project_name', sel.project_name,
    'company_name', sel.company_name,
    'category', sel.category,
    'description', sel.description,
    'allowance_amount', sel.allowance_amount,
    'due_date', sel.due_date,
    'status', sel.status,
    'chosen_option_id', sel.chosen_option_id,
    'client_chosen_at', sel.client_chosen_at,
    'client_chosen_name', sel.client_chosen_name,
    'options', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'description', o.description, 'cost', o.cost, 'supplier', o.supplier
      ) order by o.sort_order, o.created_at), '[]'::jsonb)
      from selection_options o
      where o.selection_id = sel.id
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_selection_by_token(uuid) to anon, authenticated;

create or replace function public.choose_selection_by_token(selection_token uuid, option_id uuid, chooser_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  sel selections%rowtype;
  opt selection_options%rowtype;
begin
  if chooser_name is null or length(trim(chooser_name)) = 0 then
    raise exception 'A name is required to confirm your choice.';
  end if;

  select * into sel from selections where client_approval_token = selection_token for update;

  if sel.id is null then
    raise exception 'Selection not found';
  end if;
  if sel.client_chosen_at is not null then
    raise exception 'A choice has already been recorded for this selection';
  end if;

  select * into opt from selection_options where id = option_id and selection_id = sel.id;
  if opt.id is null then
    raise exception 'That option does not belong to this selection';
  end if;

  update selections
  set chosen_option_id = opt.id,
      client_chosen_at = now(),
      client_chosen_name = trim(chooser_name),
      status = 'chosen'
  where id = sel.id;

  return jsonb_build_object('chosen_option_id', opt.id, 'chosen_at', now(), 'chosen_name', trim(chooser_name));
end;
$$;

grant execute on function public.choose_selection_by_token(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Surface pending selections on the existing client portal, same shape as
-- variations_awaiting_approval — deep-links straight to /select/<token>.
-- This extends the version from 0021_portal_enhancements.sql (financial
-- summary, photos, documents) rather than the original 0019 shape — only
-- adding the two new selections_* keys, everything else carried through
-- unchanged.
-- ---------------------------------------------------------------------------

create or replace function public.get_project_portal_data(portal_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  proj record;
  result jsonb;
begin
  select p.id, p.name, p.site_address, p.status, p.practical_completion_date, p.contract_value,
         c.name as company_name, c.qbcc_licence_number
  into proj
  from projects p
  join companies c on c.id = p.company_id
  where p.client_portal_token = portal_token;

  if proj.id is null then
    return jsonb_build_object('is_valid', false);
  end if;

  select jsonb_build_object(
    'is_valid', true,
    'project_name', proj.name,
    'site_address', proj.site_address,
    'status', proj.status,
    'practical_completion_date', proj.practical_completion_date,
    'company_name', proj.company_name,
    'licence_number', proj.qbcc_licence_number,

    'latest_progress', (
      select jsonb_build_object('entry_date', de.entry_date, 'summary', pn.summary, 'percent_complete', pn.percent_complete)
      from progress_notes pn
      join diary_entries de on de.id = pn.diary_entry_id
      where de.project_id = proj.id and de.status = 'approved'
      order by de.entry_date desc
      limit 1
    ),

    'recent_entries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'entry_date', x.entry_date, 'summary', x.summary, 'percent_complete', x.percent_complete
      ) order by x.entry_date desc), '[]'::jsonb)
      from (
        select de.entry_date, pn.summary, pn.percent_complete
        from diary_entries de
        left join progress_notes pn on pn.diary_entry_id = de.id
        where de.project_id = proj.id and de.status = 'approved'
        order by de.entry_date desc
        limit 10
      ) x
    ),

    'photos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'entry_date', x.entry_date, 'caption', x.caption, 'storage_path', x.storage_path
      ) order by x.entry_date desc, x.created_at desc), '[]'::jsonb)
      from (
        select de.entry_date, ma.caption, ma.storage_path, ma.created_at
        from media_assets ma
        join diary_entries de on de.id = ma.diary_entry_id
        where de.project_id = proj.id and de.status = 'approved' and ma.kind = 'photo'
        order by de.entry_date desc, ma.created_at desc
        limit 24
      ) x
    ),

    'documents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', d.title, 'category', d.category, 'storage_path', d.storage_path
      ) order by d.created_at desc), '[]'::jsonb)
      from documents d
      where d.project_id = proj.id and d.client_visible = true
    ),

    'milestones', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', m.name, 'status', m.status, 'target_date', m.target_date, 'actual_date', m.actual_date
      ) order by m.target_date nulls last), '[]'::jsonb)
      from milestones m
      where m.project_id = proj.id
    ),

    'variations_awaiting_approval', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', v.title, 'cost_impact', v.cost_impact, 'time_impact_days', v.time_impact_days, 'token', v.client_approval_token
      ) order by v.created_at desc), '[]'::jsonb)
      from variations v
      where v.project_id = proj.id and v.client_approved_at is null and v.status in ('draft', 'submitted')
    ),

    'variations_approved', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'title', v.title, 'cost_impact', v.cost_impact, 'approved_at', v.client_approved_at
      ) order by v.client_approved_at desc), '[]'::jsonb)
      from variations v
      where v.project_id = proj.id and v.client_approved_at is not null
    ),

    'selections_awaiting_choice', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'category', s.category, 'due_date', s.due_date, 'token', s.client_approval_token
      ) order by s.due_date nulls last, s.created_at), '[]'::jsonb)
      from selections s
      where s.project_id = proj.id and s.status = 'awaiting_choice'
    ),

    'selections_chosen', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'category', s.category, 'chosen_at', s.client_chosen_at
      ) order by s.client_chosen_at desc), '[]'::jsonb)
      from selections s
      where s.project_id = proj.id and s.status = 'chosen'
    ),

    'payment_claims', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'claim_number', pc.claim_number, 'amount_claimed', pc.amount_claimed, 'claim_date', pc.claim_date,
        'status', pc.status, 'paid_amount', pc.paid_amount
      ) order by pc.claim_date desc), '[]'::jsonb)
      from payment_claims pc
      where pc.project_id = proj.id
    ),

    'contract_value', proj.contract_value,
    'revised_contract_value', case when proj.contract_value is not null then
      proj.contract_value + coalesce((
        select sum(v.cost_impact) from variations v
        where v.project_id = proj.id and v.client_approved_at is not null and v.cost_impact is not null
      ), 0)
    else null end,
    'total_claimed', coalesce((select sum(pc.amount_claimed) from payment_claims pc where pc.project_id = proj.id), 0),
    'total_paid', coalesce((select sum(pc.paid_amount) from payment_claims pc where pc.project_id = proj.id), 0)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_project_portal_data(uuid) to anon, authenticated;
