-- CivFlow — client-facing quote acceptance.
--
-- Same problem as variations, one step earlier: a lead moves to "won" today
-- via a single internal staff click, with no actual record of the client
-- agreeing to the quoted price. Adds a no-login accept link, same pattern
-- as the invites (0002) and variation sign-off (0017) tokens.

alter table leads add column client_approval_token uuid not null default gen_random_uuid();
alter table leads add column quote_accepted_at timestamptz;
alter table leads add column quote_accepted_name text;

alter table leads add constraint leads_client_approval_token_key unique (client_approval_token);

comment on column leads.quote_accepted_at is 'When the client themselves — via the /quote/<token> link — accepted the quote. Distinct from the internal "won" status, which a staff member can still set manually for a verbal/phone acceptance.';

-- Public read of a single lead/quote by its token, for the no-login
-- /quote/<token> page.
create or replace function public.get_quote_by_token(quote_token uuid)
returns table (
  company_name text,
  client_name text,
  site_address text,
  description text,
  quote_amount numeric,
  quote_sent_date date,
  status text,
  quote_accepted_at timestamptz,
  quote_accepted_name text,
  is_valid boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select c.name, l.client_name, l.site_address, l.description, l.quote_amount, l.quote_sent_date,
           l.status, l.quote_accepted_at, l.quote_accepted_name,
           (l.quote_amount is not null)
    from leads l
    join companies c on c.id = l.company_id
    where l.client_approval_token = quote_token;
end;
$$;

grant execute on function public.get_quote_by_token(uuid) to anon, authenticated;

-- Records the client's acceptance. Sets status to 'won' so the existing
-- "Convert to project" step in the leads UI just works, same as a manual
-- acceptance would.
create or replace function public.accept_quote_by_token(quote_token uuid, accepter_name text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  l leads%rowtype;
begin
  if accepter_name is null or length(trim(accepter_name)) = 0 then
    raise exception 'A name is required to accept.';
  end if;

  select * into l from leads where client_approval_token = quote_token for update;

  if l.id is null then
    raise exception 'Quote not found';
  end if;
  if l.quote_amount is null then
    raise exception 'This quote is not ready to accept yet';
  end if;
  if l.quote_accepted_at is not null then
    raise exception 'This quote has already been accepted';
  end if;

  update leads
  set quote_accepted_at = now(),
      quote_accepted_name = trim(accepter_name),
      status = 'won'
  where id = l.id;

  return jsonb_build_object('accepted_at', now(), 'accepted_name', trim(accepter_name));
end;
$$;

grant execute on function public.accept_quote_by_token(uuid, text) to anon, authenticated;
