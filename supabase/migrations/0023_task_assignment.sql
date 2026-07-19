-- CivFlow — task assignment.
--
-- RFIs, Directions to Rectify, and NCRs were all company-wide-visible with
-- no owner — everyone could see them, but nothing said whose job it was to
-- chase an answer or close it out. Adds a simple assignee to each, feeding
-- a "My open items" widget on the dashboard. RFIs already got an
-- assigned_to column back in 0003_operations.sql, but nothing in the UI
-- ever used it — this migration only needs to catch up Directions to
-- Rectify and NCRs; the RFI assignment UI added alongside this reuses the
-- existing column.

alter table directions_to_rectify add column assigned_to uuid references profiles (id) on delete set null;
alter table non_conformance_reports add column assigned_to uuid references profiles (id) on delete set null;
