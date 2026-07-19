-- CivFlow — daily digest notifications.
--
-- Everything in the app today is pull-based: a compliance risk or an
-- overdue reminder only surfaces if someone opens CivFlow. Adds what the
-- daily digest cron job needs: an easy, RLS-safe way to get a profile's
-- email (previously only in auth.users, which normal queries can't reach),
-- and a log table so a cron that fires twice in a day doesn't double-send.

alter table profiles add column email text;

-- Backfill existing profiles from auth.users (one-off; new signups are
-- covered by the updated handle_new_user() below).
update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  kind text not null,
  sent_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (company_id, kind, sent_date)
);

alter table notification_log enable row level security;

-- Written only by the cron job (service-role key, bypasses RLS entirely).
-- Members can read their own company's log, mainly for debugging/support.
create policy "members can read their company notification log" on notification_log
  for select using (company_id = public.current_company_id());
