-- Fixes and additions arising from a side-by-side audit of QBCC's own
-- guidance against CivFlow's actual coverage (see
-- docs/qbcc-compliance-gap-analysis.md for the full comparison). Three real
-- gaps, none requiring new tables — existing tables (defects, projects,
-- safety_observations) all pre-date migration 0026's field-worker deny
-- sweep, so no additional RLS policy is needed for these new columns.
--
--   1. Defects didn't distinguish structural vs non-structural work. QBCC's
--      Standards & Tolerances Guide gives non-structural defects a 12-month
--      claim window and structural defects 6 years 6 months — very
--      different urgency for what was previously the same "open defect"
--      state.
--   2. Home Warranty Insurance premium (mandatory on residential contracts
--      over $3,300, must be remitted within 10 business days of the
--      contract) had no tracking at all.
--   3. The notifiable-incident flow only tracked a single "reported"
--      state, worded ambiguously as "WHSQ/QBCC" — but WHSQ notification
--      (s54A QBCC Act) and WorkCover Queensland notification are two
--      separate regulators with separate obligations that can both be
--      triggered by the same incident. Split into two explicit fields so
--      a builder can't mistake ticking one for having done both.

alter table public.defects
  add column defect_type text not null default 'non_structural'
    check (defect_type in ('structural', 'non_structural'));

alter table public.projects
  add column home_warranty_premium_paid boolean not null default false,
  add column home_warranty_premium_paid_date date;

alter table public.safety_observations
  add column workcover_notified_at timestamptz,
  add column workcover_reference text;
