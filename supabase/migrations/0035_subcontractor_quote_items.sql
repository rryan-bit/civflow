-- CivFlow — itemised line items for subcontractor quotes/invoices.
--
-- The AI document-filing route (ai-file/route.ts) previously only pulled a
-- single total amount out of a subcontractor quote, discarding the
-- individual scope items — and their costs/dates, where the source
-- document actually broke them out — that a builder wants when comparing
-- quotes or checking exactly what was priced. This table holds those line
-- items against the parent quote; the quote's own `amount` field remains
-- the total (either stated directly or summed from these items).

create table subcontractor_quote_items (
  id uuid primary key default gen_random_uuid(),
  subcontractor_quote_id uuid not null references subcontractor_quotes (id) on delete cascade,
  description text not null,
  amount numeric(12, 2),
  item_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table subcontractor_quote_items enable row level security;

create policy "members can manage subcontractor quote items in their company" on subcontractor_quote_items
  for all using (
    subcontractor_quote_id in (
      select id from subcontractor_quotes where project_id in (select id from projects where company_id = public.current_company_id())
    )
  )
  with check (
    subcontractor_quote_id in (
      select id from subcontractor_quotes where project_id in (select id from projects where company_id = public.current_company_id())
    )
  );

-- New table since 0026_field_workers.sql — not swept by that migration's
-- blanket-deny loop, so add the same restrictive deny explicitly per the
-- CAVEAT note in that file. Quote line items are pricing detail a field
-- worker has no reason to see.
create policy "field workers cannot access subcontractor quote items" on subcontractor_quote_items
  as restrictive
  for all
  using (not public.is_field_worker());

create trigger audit_subcontractor_quote_items after insert or update or delete on subcontractor_quote_items
  for each row execute function public.log_audit();
