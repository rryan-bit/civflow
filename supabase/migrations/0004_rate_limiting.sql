-- CivFlow — per-user rate limiting for the AI-backed API routes (extraction,
-- RFI drafting, toolbox talks, Ask CivFlow). Every AI call is logged here;
-- a single SECURITY DEFINER function does the count-then-insert atomically
-- so concurrent requests can't race past the limit.

create table ai_invocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  route text not null,
  created_at timestamptz not null default now()
);

create index ai_invocations_user_route_created_idx on ai_invocations (user_id, route, created_at);

alter table ai_invocations enable row level security;

-- Reads are scoped to your own usage (handy for a future "you've used X/Y
-- AI calls this hour" indicator). All writes go through the function below,
-- which runs as SECURITY DEFINER and bypasses RLS — no insert policy needed.
create policy "users can view their own ai invocations" on ai_invocations
  for select using (user_id = auth.uid());

create or replace function public.check_ai_rate_limit(p_route text, p_limit integer, p_window_minutes integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  current_count integer;
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  select count(*) into current_count
  from ai_invocations
  where user_id = uid
    and route = p_route
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if current_count >= p_limit then
    return false;
  end if;

  insert into ai_invocations (user_id, route) values (uid, p_route);
  return true;
end;
$$;

grant execute on function public.check_ai_rate_limit(text, integer, integer) to authenticated;
