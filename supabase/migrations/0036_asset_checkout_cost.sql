-- CivFlow — record the actual cost of a specific equipment hire/checkout.
--
-- Equipment hired for a project previously had nowhere to record its cost
-- as real, summable data — the AI document-filing route's equipment_hire
-- extraction (and the manual "Check out" form) had no cost field at all, so
-- hired-plant spend never made it into a project's Financials, unlike
-- subcontractor, materials, and labour costs which already did. This adds
-- a per-checkout total_cost, distinct from assets.hire_cost_per_day (a
-- general daily rate for the asset) since a real invoice often blends a
-- day rate with delivery fees, damage waivers etc. into a single figure
-- that doesn't cleanly divide back out.

alter table asset_checkouts add column total_cost numeric(10, 2);

comment on column asset_checkouts.total_cost is
  'Cost of this specific hire/checkout period (e.g. from a hire invoice or entered manually) — distinct from assets.hire_cost_per_day, which is just a general daily rate for the asset. Summed per project into Financials.';
