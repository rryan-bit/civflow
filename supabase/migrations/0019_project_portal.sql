-- CivFlow — client project portal.
--
-- A single no-login link per project the builder can hand their client,
-- so "where are we up to?" has a self-serve answer instead of a phone call.
-- Read-only by design — the only "actions" it offers are deep links into
-- the existing variation/quote approval pages, which already have their
-- own tightly-scoped tokens. This function deliberately hand-picks what's
-- client-appropriate (approved diary entries only, no internal cost
-- breakdowns/margin, no draft/internal-only records) rather than exposing
-- raw tables.

alter table projects add column client_portal_token uuid not null default gen_random_uuid();
alter table projects add constraint projects_client_portal_token_key unique (client_portal_token);

comment on column projects.client_portal_token is 'Used to build a no-login /portal/<token> link for the client to check progress themselves.';

create or replace function public.get_project_portal_data(portal_token uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  proj record;
  result jsonb;
begin
  select p.id, p.name, p.site_address, p.status, p.practical_completion_date, c.name as company_name, c.qbcc_licence_number
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
      select coalesce(jsonb_agg(jsonb_build_object('entry_date', de.entry_date) order by de.entry_date desc), '[]'::jsonb)
      from (
        select entry_date from diary_entries
        where project_id = proj.id and status = 'approved'
        order by entry_date desc
        limit 8
      ) de
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

    'payment_claims', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'claim_number', pc.claim_number, 'amount_claimed', pc.amount_claimed, 'claim_date', pc.claim_date, 'status', pc.status
      ) order by pc.claim_date desc), '[]'::jsonb)
      from payment_claims pc
      where pc.project_id = proj.id
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_project_portal_data(uuid) to anon, authenticated;
