-- CivFlow — client portal enhancements.
--
-- The read-only client portal (0019_project_portal.sql) originally showed
-- just the latest progress note, bare dates for recent entries, milestones,
-- and payment claim status/amounts — deliberately excluding photos and
-- documents since the `diary-media` storage bucket requires an
-- `authenticated` role to read (see 0001_init.sql), which an anonymous
-- portal visitor doesn't have. This migration:
--
--   1. Adds `documents.client_visible` so a builder can flag which uploaded
--      documents (plans, permits, etc.) are safe to share with the client —
--      defaults to false so nothing is exposed by accident.
--   2. Extends get_project_portal_data() to also return:
--      - a financial summary (contract value, revised contract value
--        including approved variations, total claimed, total paid) so the
--        client has visibility into billing without seeing internal costs
--        or margin;
--      - enriched recent_entries with each entry's summary/percent-complete
--        (not just the date), so the portal can show a real progress
--        history instead of only the single latest update;
--      - raw storage_path values for recent approved-entry photos and for
--        client_visible documents. These paths are not directly fetchable
--        by an anonymous visitor (the bucket still requires an authenticated
--        role) — the portal page mints short-lived signed URLs for them
--        server-side using the service-role admin client, so the token
--        itself is still the only thing that grants access, and it stays
--        scoped to exactly this project.

alter table documents add column client_visible boolean not null default false;

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

    -- Now carries each entry's summary + percent-complete (not just the
    -- date), so the portal can render a real progress history.
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

    -- Raw storage paths for photos on the same recent approved entries —
    -- turned into signed URLs by the portal page, not usable on their own.
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

    -- Documents the builder has explicitly flagged as client-visible.
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

    'payment_claims', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'claim_number', pc.claim_number, 'amount_claimed', pc.amount_claimed, 'claim_date', pc.claim_date,
        'status', pc.status, 'paid_amount', pc.paid_amount
      ) order by pc.claim_date desc), '[]'::jsonb)
      from payment_claims pc
      where pc.project_id = proj.id
    ),

    -- Financial summary — deliberately just the top-line figures a client
    -- would already expect to see on an invoice/statement, never the
    -- builder's internal costs or margin.
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
