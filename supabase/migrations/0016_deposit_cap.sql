-- CivFlow — BIF Act deposit cap tracking.
-- QLD's Building Industry Fairness (Security of Payment) Act caps the
-- deposit on a "regulated" (domestic building) contract at 5% of the
-- contract price once that price exceeds $20,000. Record the deposit
-- actually taken so the app can warn a builder before they're in breach,
-- rather than relying on them to remember the threshold.

alter table projects add column deposit_amount numeric;

comment on column projects.deposit_amount is
  'Deposit taken on this contract, in AUD. Used to flag BIF Act 5% deposit cap breaches on regulated (domestic building) contracts over $20,000.';
