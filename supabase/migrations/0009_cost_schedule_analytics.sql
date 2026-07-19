-- CivFlow — Cost & schedule analytics.
--
-- Adds the fields needed to roll up contract value, billing progress, and
-- program status per project (and across the portfolio on the dashboard):
-- an original contract value + planned dates on projects, and actual
-- completion + delay reason on milestones. Approved variations already
-- carry cost_impact/time_impact_days (migration 0003) — those feed the
-- "revised" contract value and forecast completion date alongside these
-- new columns, so nothing here duplicates that.

alter table projects add column contract_value numeric(12, 2);
alter table projects add column start_date date;
alter table projects add column contracted_completion_date date;

alter table milestones add column actual_date date;
alter table milestones add column delay_reason text;
