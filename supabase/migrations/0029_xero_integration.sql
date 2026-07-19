-- CivFlow — Xero accounting sync (v1: push payment claims as invoices).
--
-- Each company connects its OWN Xero organisation via OAuth2 (CivFlow only
-- needs a free Xero Developer app registration to make the handshake
-- possible — this never costs CivFlow or the customer anything beyond
-- whatever Xero subscription they already have). A progress claim can be
-- pushed to Xero as an ACCREC invoice; a daily cron polls Xero for payment
-- status and marks the claim paid once Xero says the invoice is settled.
--
-- Token storage: xero_connections gets RLS enabled but deliberately NO
-- policies for the `authenticated` role at all — not even a SELECT scoped
-- to admins. Access/refresh tokens are bearer credentials for someone's
-- real accounting system; the only way in or out is the service-role
-- admin client from a server route that has already checked the caller is
-- a company admin. Anything the UI needs to know (connected? which org?)
-- goes through get_xero_connection_status() below, which never returns a
-- token.

create table xero_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies (id) on delete cascade,
  tenant_id text not null,
  tenant_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table xero_connections enable row level security;
-- No policies created — see note above. Only the service-role client can
-- read or write this table.

create trigger audit_xero_connections after insert or update or delete on xero_connections
  for each row execute function public.log_audit();

create or replace function public.get_xero_connection_status()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object('connected', true, 'tenant_name', tenant_name, 'connected_at', created_at)
      from xero_connections
      where company_id = public.current_company_id()
    ),
    jsonb_build_object('connected', false)
  );
$$;

grant execute on function public.get_xero_connection_status() to authenticated;

-- A Xero invoice needs a Contact with at least a name — projects currently
-- have no client contact fields at all (the client portal is reached by
-- token, not by looking up a client record), so add the minimum needed.
-- xero_contact_id caches the match so repeat claims on the same project
-- reuse one Xero contact instead of creating a duplicate each time.
alter table projects add column client_name text;
alter table projects add column client_email text;
alter table projects add column xero_contact_id text;

alter table payment_claims add column xero_invoice_id text;
alter table payment_claims add column xero_invoice_status text;
alter table payment_claims add column xero_synced_at timestamptz;
