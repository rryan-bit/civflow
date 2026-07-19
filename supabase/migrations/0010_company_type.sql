-- CivFlow — company type (residential builder vs. commercial/civil
-- contractor) and self-serve company creation.
--
-- Until now there was no way for a brand-new signup to actually create a
-- company — profiles.company_id started null and an admin had to assign it
-- manually in Supabase (the invite-link flow from 0002_invites.sql covers
-- joining an *existing* company, but not starting a new one). This adds
-- that missing piece, plus a company_type flag the app uses to decide how
-- much of the QBCC-compliance-heavy tooling (Directions to Rectify,
-- Inspections, NCRs) to surface by default. Existing companies default to
-- 'commercial_contractor' so nothing already built changes for them.

alter table companies add column company_type text not null default 'commercial_contractor'
  check (company_type in ('residential_builder', 'commercial_contractor'));

-- Creates a new company and makes the calling user its admin. Only usable
-- by an authenticated user who isn't already attached to a company — this
-- is the only way to create a company from the client (there's still no
-- general INSERT policy on companies), mirroring how redeem_invite() is
-- the only way to join one.
create or replace function public.create_company(company_name text, company_type text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  new_company_id uuid;
  existing_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select company_id into existing_company_id from profiles where id = auth.uid();
  if existing_company_id is not null then
    raise exception 'Your account is already linked to a company';
  end if;

  if company_name is null or trim(company_name) = '' then
    raise exception 'Company name is required';
  end if;

  insert into companies (name, company_type)
  values (trim(company_name), company_type)
  returning id into new_company_id;

  update profiles
  set company_id = new_company_id, role = 'admin'
  where id = auth.uid();

  return jsonb_build_object('company_id', new_company_id);
end;
$$;

grant execute on function public.create_company(text, text) to authenticated;
