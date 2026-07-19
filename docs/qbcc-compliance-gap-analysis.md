# QBCC Compliance — Side-by-Side Gap Analysis

A direct comparison of every obligation in `docs/qbcc-compliance-reference.md` against
CivFlow's actual codebase, done by reading the real source (not just checking feature names
off a list). Three real gaps and two mislabelled/incomplete checks were found and fixed as
part of this pass — details below, migration `0034_compliance_gap_fixes.sql`. Everything
else was already correctly covered.

## Licensing (company + individual)

CivFlow already tracks a company's licence number, class, and expiry (`companies` table,
`compliance/company-licence-form.tsx`), plus an individual's own licence
(`compliance/profile-licence-form.tsx`) for nominees/site supervisors. Expiry is surfaced as
a red/amber alert 60 days out via `getComplianceAlerts()`. No gap — this fully matches the
regime in §1 of the reference doc.

## Minimum Financial Requirements (MFR)

Already covered well: `companies.mfr_category` (all 9 categories) and
`companies.mfr_report_due_date` exist, the annual reporting alert fires 30 days out or when
overdue, and the Compliance page already explains the correct lodgement windows (SC1/SC2:
1 Nov–31 Mar; Categories 1–7: 1 Aug–31 Dec) including the "a company holding SC1/SC2 still
has to report" nuance. One real gap found: the due date had to be worked out and typed in by
hand every year. **Fixed** — added a "Suggest from category" button next to the due-date
field (`company-licence-form.tsx`) that computes the next upcoming lodgement deadline from
the selected category.

## Home Warranty Insurance (QHWS)

**Gap — not tracked at all.** The $3,300 trigger threshold, the requirement to remit the
premium within 10 business days, and any record of whether it had been paid had no
representation anywhere in the schema. **Fixed**: added `projects.home_warranty_premium_paid`
and `home_warranty_premium_paid_date` (migration 0034). The Financials page now shows a
paid/unpaid toggle once contract value exceeds $3,300, an amber banner reminding the builder
it's outstanding, and a company-wide amber compliance alert (`getComplianceAlerts()`) for any
active project over the threshold that hasn't been marked paid.

## Domestic building contracts — deposit cap

**Gap — wrong tier, wrong citation.** The existing `checkDepositCap()` only modelled a flat
5% cap on contracts over $20,000, silently missing the lower tier: **$3,301–$19,999
contracts are capped at 10%, not left unchecked.** A $15,000 reno with a $10,000 (67%)
deposit would previously have shown zero compliance risk. It was also labelled "BIF Act,"
which is the wrong regime — the deposit cap comes from the Domestic Building Contracts
provisions, now Schedule 1B of the QBCC Act (formerly its own standalone Act), a separate
regime from the BIF Act (payment claims/adjudication/trust accounts). **Fixed**:
`financial-calcs.ts` now models both tiers correctly (10% under $20,000, 5% at/above,
Act doesn't apply at/under $3,300) and every message referencing this check — the contract
form, the Financials page banner, and the compliance alert — cites the correct provision.
9 new/updated unit tests cover both tiers plus the previously-unflagged $15k/50%-deposit case.

## BIF Act — payment claims, payment schedules, adjudication

Already solid: the new-claim form defaults `due_date`/`schedule_due_date` to 15 business days
out with an explanation of the BIF Act maximum, and a supporting-statement panel exists.
One real gap: the company-wide Compliance Health check only flagged claims *missing a
supporting statement* — it never flagged a claim that had actually gone **past its due date**
(visible only on the claim's own detail page, not surfaced anywhere company-wide). **Fixed**:
`getComplianceAlerts()` now also flags any submitted/schedule-received claim past its due date
as red ("consider escalating to adjudication"), or amber if due within 3 days.

## Project Trust Accounts

Correctly not built — the $10M threshold means this doesn't apply to a small residential/
light-commercial builder, and the regime is currently paused pending the Productivity
Commission review. No gap; revisit if the government's 2026 response lowers the threshold.

## QBCC Code of Conduct — licence number display

Already covered: licence number appears on printed reports and the shared letterhead
component used across diary entries, variations, and client reports. No gap.

## Standards and Tolerances Guide — defects

**Gap — no structural/non-structural distinction.** The Defects register treated every open
defect identically, but QBCC gives non-structural defects a 12-month claim window and
structural defects 6 years 6 months — very different urgency hiding behind the same "open"
badge. **Fixed**: added `defects.defect_type` (migration 0034), a type selector on the
add-defect form, a badge on each defect row (orange for structural, neutral for
non-structural), and an inline hint showing the applicable claim window for each type
(`practical-completion/defects-panel.tsx`).

## Direction to Rectify, demerit points

Already covered: a full DTR register with a 35-day clock exposed as a red/amber compliance
alert, status tracking (open/overdue), and public-record-style visibility within the project.
Demerit point *tallying* isn't modelled (QBCC doesn't expose this as data a third party can
read), which is a reasonable scope limit rather than a gap.

## Notifiable incidents — WHSQ vs WorkCover

**Gap — two obligations conflated into one.** The safety register's notifiable-incident flow
had a single "reported" state labelled "Record as reported to WHSQ/QBCC" — but WHSQ
notification (s54A QBCC Act) and WorkCover Queensland notification are separate regulators
with separate obligations, and satisfying one doesn't satisfy the other. **Fixed**: added
`safety_observations.workcover_notified_at`/`workcover_reference` (migration 0034) so the two
can be recorded independently, split the UI into two explicit controls
(`safety/notifiable-control.tsx`), and added an explanatory note once either is recorded.

## Insurance (WorkCover, public liability, professional indemnity)

Subcontractor insurance expiry is tracked and alerted (red/amber, 30 days out) — the
company's own WorkCover/PI insurance isn't modelled as data, which is reasonable since these
are policy-level facts a builder holds externally, not something tied to a specific
project/entity in the schema. No gap identified worth building for.

## CPD

Correctly not built. Compulsory CPD doesn't yet apply to builders/site supervisors generally
— only pool safety inspectors and adjudicators currently have mandatory annual CPD. Revisit
if/when CCPD is legislated more broadly (flagged in the reference doc as something to watch).

## Licence fees / renewal

Not directly modelled beyond the existing expiry alert, which is the part that actually
matters operationally (a lapsed licence, not the fee amount itself). No gap.

## Subcontractor management obligations

Already strong: licence/insurance expiry alerts, BIF Act supporting-statement tracking,
retention-release alerts past 90 days post-completion. No gap.

## Recent 2026 reforms (email-first communication, new infringement powers, ministerial
review)

Not something software can "cover" directly — these are regulatory/process changes rather
than data-tracking obligations. Noted in the reference doc for awareness; no corresponding
build item.

---

## Summary of changes made this pass

One migration (`0034_compliance_gap_fixes.sql`, three new/changed tables — no new RLS needed,
all three pre-date the field-worker deny sweep):

- `defects.defect_type` (structural / non_structural)
- `projects.home_warranty_premium_paid`, `home_warranty_premium_paid_date`
- `safety_observations.workcover_notified_at`, `workcover_reference`

Code changes: tiered deposit cap logic + corrected legal citation
(`financial-calcs.ts`), a new home-warranty-premium compliance alert and a new
overdue-payment-claim compliance alert (`compliance.ts`), a defect-type selector with claim-
window hints (`defects-panel.tsx`), a split WHSQ/WorkCover notification UI
(`notifiable-control.tsx`), and an MFR due-date suggestion helper
(`company-licence-form.tsx`). 9 new unit tests added, all 66 tests passing, `tsc`/`eslint`/
`next build` all clean.

**Action needed from Ryan**: like every other schema change in this project, migration 0034
needs to be run against the live Supabase database (SQL Editor, paste-and-run) before these
checks go live — it won't happen automatically.
