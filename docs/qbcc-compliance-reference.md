# QBCC Compliance Reference — Small Queensland Building Company

Researched July 2026. This is a practical reference for a small QLD residential/commercial
building company, covering every compliance obligation a licensee is likely to encounter —
licensing, financial reporting, insurance, contracts, payments, trust accounts, conduct,
defects, safety, and enforcement. It's written for CivFlow's own roadmap planning as well as
for Ryan's general understanding, not as legal advice — QBCC requirements change (see
"Recent and upcoming changes" below), and a few areas are genuinely in flux right now. Always
confirm current figures/thresholds directly with QBCC or a construction lawyer before relying
on them for a real transaction.

---

## 1. Licensing

Every "building work" contractor or company doing work above trivial value needs a QBCC
licence in the relevant class. Key structures:

- **Individual licences** — for sole traders/individuals doing hands-on licensed work.
- **Company licences** — the company itself is licensed, but must have a **nominee
  supervisor** (a licensed individual, usually a director or employee) whose personal
  licence "backs" the company's.
- **Site Supervisor licences** — three classes by scope: **Low Rise** (houses, townhouses,
  Class 2–9 buildings up to 2000m², excluding Type A/B construction), **Medium Rise** (up to
  3 storeys, excluding Type A), and **Open** (no height/size restriction). Tied to the
  nationally recognised qualifications CPC40120 / CPC50220 / CPC60220 respectively. A site
  supervisor must be an employee/officer of a licensed contractor — can't contract out
  supervision separately.
- **Builder / trade contractor licences** — scoped by class (e.g. Builder – Low Rise,
  Builder – Open, and dozens of trade-specific classes like carpentry, roofing, etc.),
  matched to the technical qualification held.

**What this means for a small builder**: at minimum, someone in the company (often the
director) needs a Builder licence in the class matching the work being done, and if the
company itself holds the licence, a nominated supervisor must be recorded with QBCC and kept
current — if that person leaves, the company has a limited window to nominate a replacement
or risks losing the licence.

Sources: [Which licence type you need](https://www.qbcc.qld.gov.au/licences/start-your-career/which-licence-type-you-need), [QBCC Builder Licence Guide 2026](https://prepare.com.au/blog/qbcc-licence-guide), [Available licences](https://www.qbcc.qld.gov.au/licences/apply-licence/available-licences)

---

## 2. Minimum Financial Requirements (MFR) and annual reporting

Every QBCC contractor licensee must continuously meet the Minimum Financial Requirements —
this is a standing condition of holding a licence, not a one-off check at application.

**Financial categories** (9 total, defined by maximum allowable annual revenue):

| Category | Maximum revenue | Annual report required? |
|---|---|---|
| SC1 (self-certifying) | up to $200,000 | No — self-certify only |
| SC2 (self-certifying) | up to $800,000 | No — self-certify only |
| 1–3 | up to $30,000,000 | Yes, MFR report required |
| 4–7 | $30,000,001 and over | Yes, MFR report required |

**Net Tangible Assets (NTA)** — the other pillar of MFR. NTA = total assets − total
liabilities − intangible assets (goodwill, IP, trademarks). Each category has a minimum NTA
threshold scaled to its maximum revenue, and a licensee's actual current ratio/NTA must
support the revenue category they're licensed for. A drop in NTA below the threshold, or
revenue exceeding the category cap, triggers a reporting obligation even outside the annual
cycle.

**Annual reporting deadlines**:
- Categories 1–7: lodgment window **1 August – 31 December** each year.
- SC1/SC2: lodgment window **1 November – 31 March**.
- SC1/SC2 licensees under $800,000 revenue don't have to submit annual financial
  information at all — self-certification is sufficient in normal years.
- An MFR *report* (a formal accountant-prepared financial position report) is a separate,
  narrower requirement — only needed for things like a new licence application, increasing
  your revenue category, or reporting a drop in NTA. It is **not** the same as the routine
  annual reporting obligation.

**For CivFlow**: this is a strong candidate for a compliance-alert type (deadline-driven,
company-wide, not project-scoped) — an annual reminder in the Aug–Dec window (or Nov–Mar for
SC1/SC2) keyed off the company's declared MFR category.

Sources: [What are minimum financial requirements?](https://www.qbcc.qld.gov.au/running-your-business/financial-requirements/what-are-minimum-financial-requirements), [MFR and annual reporting](https://www.qbcc.qld.gov.au/licences/maintain-your-licence/mfr-annual-reporting), [Guide to MFR and annual reporting (PDF)](https://www.qbcc.qld.gov.au/sites/default/files/documents/guide-mfr-annual-reporting.pdf), [MFR report or declaration](https://www.qbcc.qld.gov.au/running-your-business/financial-requirements/financial-reporting-obligations-contractor-licensees-0)

---

## 3. Queensland Home Warranty Scheme (QHWS)

Compulsory insurance protecting homeowners if a residential job goes wrong (unfinished,
defective, or the contractor dies/disappears/becomes insolvent).

- **Trigger threshold**: any residential construction work valued over **$3,300** (inc.
  materials, labour and GST) requires the premium to be paid.
- **Who pays whom**: the *homeowner* funds the premium, but the *contractor* is responsible
  for collecting it (as part of the deposit/contract price) and remitting it to QBCC —
  within **10 business days** of entering the contract, and before work begins.
- **Premium scale**: increases in $1,000 increments of insurable value (e.g. ~$214.85 at
  $4,000 insurable value, ~$222.00 at $5,000) — a small builder should budget/quote this into
  every residential contract over $3,300 rather than treating it as an afterthought.
- Applies to new homes, renovations, extensions — essentially all licensed residential
  building work above the threshold, not just new-builds.

**For CivFlow**: the `deposit_amount` cap-warning feature already built could be extended to
flag "home warranty premium not yet remitted" once a project's contract value crosses $3,300
— a natural fit alongside the existing deposit-cap compliance check.

Sources: [What is home warranty insurance](https://www.qbcc.qld.gov.au/home-owner-hub/queensland-home-warranty-scheme/what-home-warranty-insurance), [Calculating the premium](https://www.qbcc.qld.gov.au/running-your-business/home-warranty-insurance-obligations/calculating-premium), [What is the QBCC Home Warranty Insurance Premium?](https://www.johnmunrobuilder.com.au/what-is-the-qbcc-home-warranty-insurance-premium/)

---

## 4. Domestic building contracts (Schedule 1B, QBCC Act)

Historically the standalone *Domestic Building Contracts Act 2000*, this regime now sits as
**Schedule 1B of the QBCC Act** — same substantive rules, different location in the
legislation, which matters if searching for current provisions.

- **Written contract threshold**: any domestic building work over **$3,300** requires a
  compliant written contract.
- **Deposit caps** (maximum deposit as % of contract price):
  - $3,301–$19,999 (Level 1 contract): max **10%**.
  - $20,000+ (Level 2 contract): max **5%**.
  - Exception: if more than 50% of the contract price is off-site prefabrication work, max
    deposit is **20%** regardless of total value.
- **Cooling-off period**: **5 business days**, starting the day after the homeowner receives
  a signed copy of the full contract (plans/specs included), and for contracts ≥$20,000, the
  QBCC Consumer Building Guide too. Withdrawal must be a signed written notice citing s35 of
  Sch 1B. If the owner withdraws, they typically owe the contractor $100 plus reasonable
  out-of-pocket expenses already incurred.
- Also governs: variations must be in writing and signed by the homeowner before proceeding
  (CivFlow's existing client-approval-link flow for variations already covers this);
  statutory warranties on workmanship; defects liability obligations.

**For CivFlow**: the existing deposit-cap warning and variation client-approval-link
features already map directly onto this Act's core requirements — worth double-checking the
deposit cap logic uses the correct 10%/5%/20% tiers rather than a flat percentage.

Sources: [Cooling-off period](https://www.qbcc.qld.gov.au/home-owner-hub/build-renovate/contracts-payments/cooling-off-period), [Domestic Building Contracts Act 2000 (legislation)](https://www.legislation.qld.gov.au/view/pdf/2000-07-07/act-2000-009), [Domestic building contracts guide (PDF)](https://www.qbcc.qld.gov.au/sites/default/files/2021-09/guide-domestic-build-contract-owner-contractor.pdf)

---

## 5. Building Industry Fairness (Security of Payment) Act 2017 (BIF Act)

Governs the progress-payment claim/dispute process for construction work generally
(commercial and residential alike, not just domestic contracts).

- **Payment claims**: a written document identifying the work, the claimed amount, and
  requesting payment — one per contractual "reference date" (defaults to the last day of
  each month if the contract doesn't specify one).
- **Payment schedules**: the respondent (client/head contractor) must either pay the claim in
  full or issue a payment schedule within **15 business days**, stating the amount they
  propose to pay and, if less than claimed, why.
- **Adjudication**: a fast, low-cost dispute pathway for unresolved progress-payment
  disagreements — lodged with QBCC (via myQBCC or hard copy). Adjudication decisions require
  payment within **5 business days** of the decision. Non-compliance exposes the respondent
  to the claimant registering the determination as a court judgment, plus potential QBCC
  disciplinary action.
- **Supporting statements**: for claims against a head contractor above a threshold, a
  supporting statement declaring subcontractors have been paid is required alongside the
  claim (CivFlow's payment claims module already has this field).

**For CivFlow**: the existing Payment Claims register already covers the claim/schedule
lifecycle — worth checking whether the 15-business-day payment-schedule deadline is
surfaced as a compliance alert the way EOT notice deadlines now are.

Sources: [A Practical Guide to the BIF Act](https://www.lexology.com/library/detail.aspx?g=9cd12fa0-797f-47f3-a4b5-3946e9cf6893), [Payment Schedules under the BIF Act](https://buildingindustryfairnessact.com.au/payment-schedules/), [QBCC Adjudication Process](https://brunetlaw.com.au/qbcc-adjudication-process-queensland/), [Payments in the building industry](https://www.business.qld.gov.au/industries/building-property-development/building-construction/payments-financing/payment)

---

## 6. Project Trust Accounts (PTAs) and Retention Trust Accounts

A newer layer under the BIF Act, protecting subcontractor progress payments and retention
money by requiring the head contractor to hold funds in a dedicated trust account rather than
general working capital.

- **Current threshold**: applies to private-sector, local government, statutory authority
  and government-owned-corporation contracts of **$10 million or more**.
- **Status as of 2026**: on **10 February 2025** the Queensland Government paused further
  rollout of trust accounts to private projects below $10 million (part of the "Building Reg
  Reno" program), pending a Productivity Commission review. That review's final report
  landed **21 January 2026**; the government's formal response on the trust-account regime's
  future is still pending as of mid-2026.
- **Practical implication for a small builder**: unless the company routinely takes on
  contracts at/above $10 million (unlikely for most small residential/light-commercial
  builders), PTAs are currently not a live obligation — but this is worth re-checking
  periodically given the pending government response, since a lower threshold has been
  floated in the original legislative design.

Sources: [Trust account framework](https://www.housing.qld.gov.au/news-publications/legislation/building/trust-accounts/trust-account-framework), [2026: Key Construction Changes in Qld, NSW and Vic](https://batchmewing.com.au/2026-construction-changes-qld-nsw-vic/), [Trustee guide: Project trusts (PDF)](https://www.qbcc.qld.gov.au/sites/default/files/documents/guide-trustee-project-trusts.pdf)

---

## 7. QBCC Code of Conduct — advertising, licence number display

- **Contracts**: ss54 and 67(4) of the QBCC Act require the licence number to appear on
  every written contract.
- **Advertising**: any advertising must show the name the licensee is licensed under (a
  trading name may be used, but must be accompanied by the licensed name) plus the QBCC
  licence number. It must be legible/prominent in print or visual media, and no less
  audible/clear than other spoken content in audio/video ads.
- **The QBCC logo itself cannot be used** on any promotional material — a specific and easy
  mistake to make.
- Licence numbers are not required on hi-vis shirts/vests etc., but vehicle signage
  commonly displays them as standard trade practice (QBCC's site-signage guidance covers
  signage requirements more broadly).

**For CivFlow**: already covers "licence number on printed reports" (task #61) — this
extends the same requirement to contracts and any marketing collateral generated through the
platform (e.g. quote PDFs, client-facing report headers), which appears already handled via
the shared letterhead component.

Sources: [Advertising](https://www.qbcc.qld.gov.au/running-your-business/advertising), [Site signage](https://www.qbcc.qld.gov.au/onsite-building-requirements/site-signage-advertising-requirements), [Key information for QBCC licensees (PDF)](https://www.qbcc.qld.gov.au/sites/default/files/documents/guide-key-information-licensee-home-owners.pdf)

---

## 8. Standards and Tolerances Guide — defects

QBCC's reference for what counts as defective work and the applicable rectification
timeframes, used in both Direction to Rectify decisions and home warranty claims.

- **Non-structural defects**: work that doesn't meet a reasonable standard of construction
  or finish for a competent licensee of that class, or a "settling-in period" defect in a
  new build. Must generally be raised within **12 months** of practical completion.
  - Example tolerances: floor level variance >10mm within a room (or >12mm over 3m), wall
    frame deviation from vertical >4mm per 2m height.
- **Structural defects** (and subsidence-caused defects): a much longer window — **6 years
  and 6 months** from completion.
- **Slab crack categories**: Category 1 (hairline, <0.2mm) through Category 4 (>4mm or with
  vertical displacement) — used to grade severity in disputes/inspections.

**For CivFlow**: the existing Defects register (task #63/#68 area) and NCR module could
reference these numeric tolerances directly, and the 12-month vs 6.5-year distinction is
relevant to how long a defect record should stay "open" or flagged for statute-of-limitations
purposes.

Sources: [Standards and tolerances guide](https://www.qbcc.qld.gov.au/resources/guide/standards-tolerances-guide), [Standards and Tolerances Guide, Dec 2023 (PDF)](https://www.qbcc.qld.gov.au/sites/default/files/documents/guide-standards-tolerances.pdf), [What is defective work](https://www.qbcc.qld.gov.au/complaints-disputes/building-work-issue/defective-work-dispute/what-defective-work)

---

## 9. Direction to Rectify (DTR), demerit points, disciplinary action

- **Direction to Rectify**: a legally binding QBCC instruction to fix defective work,
  issued after a site inspection (usually following a homeowner complaint). Standard
  rectification period is **35 days**.
- Each DTR is recorded on the licensee's **public record** as complied/not complied —
  visible to anyone checking a licence, including future clients.
- **Non-compliance consequences**: up to 10 demerit points, prosecution (max penalty
  $34,462), fines (up to $2,757), QCAT/court disciplinary action, licence conditions, or
  show-cause notices that can lead to suspension/cancellation.
- **Demerit point thresholds**: 30 demerit points within a rolling 3-year period → 3-year
  disqualification from holding a licence. A second 30-point accumulation within 10 years of
  the first disqualification → **lifetime disqualification**.

**For CivFlow**: the existing Directions to Rectify register (task #58) is the right shape —
worth confirming it tracks the 35-day rectification clock as a compliance alert (similar
pattern to the EOT notice-deadline alert already built) and, longer-term, could track a
running demerit-point tally if QBCC ever exposes that data.

Sources: [Direction to rectify](https://www.qbcc.qld.gov.au/non-compliance/consequences-non-compliance/direction-rectify), [Demerit points](https://qbcc.qld.gov.au/non-compliance/consequences-non-compliance/demerit-points), [The QBCC Direction to Rectify: A Builder's 2026 Guide](https://www.merlolaw.com.au/post/the-qbcc-direction-to-rectify-a-builder-s-complete-2026-guide), [Consequences for non-compliance](https://www.qbcc.qld.gov.au/non-compliance/consequences-non-compliance)

---

## 10. Notifiable incidents and safety reporting

Two **separate** regulators, two separate obligations — easy to conflate:

- **QBCC / WHSQ (Workplace Health and Safety Queensland)**: a QBCC licensee in control of, or
  carrying out work on, a building site must notify WHSQ of a **notifiable incident** — death,
  serious injury/illness, or a "dangerous incident" — in the **fastest way possible**.
  Failure to do so is a specific offence under **s54A of the QBCC Act**.
- **WorkCover Queensland**: a separate reporting/insurance regime under the workers'
  compensation system — notifying WHSQ does **not** satisfy any WorkCover notification
  obligation, and vice versa. Both may be triggered by the same incident.

**For CivFlow**: the existing Safety register + notifiable-incident tracking (tasks #34,
#59) should make clear in its UI copy that WHSQ notification and WorkCover notification are
two distinct steps, since this is a documented source of confusion industry-wide.

Sources: [Report a safety issue or incident](https://www.qbcc.qld.gov.au/complaints-disputes/report-safety-issue-incident), [Confirm if an incident is notifiable](https://www.worksafe.qld.gov.au/safety-and-prevention/incidents-and-notifications/notify-us-of-an-incident/notify-workplace-health-and-safety-queensland-or-electrical-safety-office/confirm-if-an-incident-is-notifiable), [Incidents that need to be reported to WHSQ](https://www.business.qld.gov.au/running-business/whs/incident-reporting/whsq)

---

## 11. Insurance obligations (beyond home warranty)

- **WorkCover Queensland**: compulsory for any employer with workers (including most
  subcontractor arrangements depending on structure) — a completely separate policy from
  QHWS home warranty insurance, administered by WorkCover, overseen by WHSQ.
- **Public liability insurance**: not directly mandated by QBCC for all licensees, but
  almost universally required contractually — head contracts and subcontract agreements
  typically specify a minimum cover amount, effectively making it compulsory in practice.
- **Professional indemnity (PI) insurance**: required for specific licence classes (notably
  design-related and certain certifier classes) — not a universal builder requirement, but
  relevant if the company's licence class includes design services.

Sources: [Professional indemnity insurance](https://www.qbcc.qld.gov.au/licences/apply-licence/eligibility-requirements/professional-indemnity-insurance), [Insurance responsibilities](https://www.qbcc.qld.gov.au/home-owner-hub/build-renovate/contracts-payments/insurance-responsibilities)

---

## 12. Continuing Professional Development (CPD) — currently limited scope

Worth flagging because it's easy to assume this is a universal requirement when it isn't yet:

- **As of mid-2026, compulsory CPD is NOT a general requirement** for most QBCC licence
  classes. Only a small number of licence types — notably **pool safety inspectors** and
  **adjudicators** — currently have mandatory annual CPD obligations tied to renewal.
  Builders, site supervisors and most trade contractor classes do **not** currently have a
  compulsory CPD requirement.
  Note: this is a related but distinct scheme — CivFlow's `.env.local.example` comment for
  Xero mentions nothing about this; no code currently assumes CPD tracking, which is correct
  given it's not yet a general obligation.
- **This may change**: QBCC has trialled a compulsory CPD (CCPD) framework and flagged that,
  if legislated, all licensees would need to meet professional development requirements
  before renewal. Watch the Regulatory Impact Statement process on the QBCC / Department of
  Energy and Public Works website.

**For CivFlow**: not worth building CPD tracking as a general feature yet — worth revisiting
if/when CCPD is legislated across all licence classes, since that would turn this into a
company-wide compliance-alert candidate similar to MFR annual reporting.

Sources: [Continuing professional development](https://www.qbcc.qld.gov.au/licences/maintain-licence/continuing-professional-development), [Compulsory CPD in the building and construction industry](https://www.qbcc.qld.gov.au/news/compulsory-continuing-professional-development-building-construction-industry)

---

## 13. Licence fees and renewal

- QBCC fees and charges typically increase on **1 July** each year.
- Since **1 February 2026** (Amendment Regulation 2026, "Tranche 3" of the Building Reg
  Reno), the fee structure explicitly separates two components: the **licence application
  fee** (paid on submission) and the **licence fee** (paid on grant) — previously implicit,
  now defined terms in the Regulation. Doesn't change what's owed in substance, but changes
  how it's itemised/described.
- Licence renewal is typically an annual cycle managed through myQBCC; lapsed renewal risks
  the licence lapsing entirely (distinct from suspension/cancellation via disciplinary
  action).

Sources: [Licence fees](https://www.qbcc.qld.gov.au/licences/apply-licence/licence-fees), [Renew, restore, replace your licence](https://qbcc.qld.gov.au/licences/maintain-your-licence/renew-restore-replace-your-licence), [QBCC Licensing Changes 2026](https://bosslawyers.com.au/qbcc-licensing-changes-2026-what-queensland-builders-and-contractors-need-to-know/)

---

## 14. Subcontractor management obligations

Not a single named QBCC regime, but a bundle of obligations that fall on the head
contractor when engaging subcontractors:

- Verify each subcontractor holds a **current, appropriately-classed QBCC licence** before
  engaging them — engaging an unlicensed contractor for licensable work is itself an offence
  and can expose the head contractor to disciplinary risk.
- Verify current **insurance** (public liability at minimum, WorkCover coverage if they have
  employees).
- **Supporting statements** under the BIF Act (see §5) — the head contractor must declare
  subcontractors have been paid before claiming further payment from the client above the
  relevant threshold.
- **Retention** — where a contract provides for retention money, obligations around how and
  when it's held/released apply (linked to the broader PTA/trust account framework in §6
  where thresholds are met).

**For CivFlow**: the existing Subcontractor register already tracks licence/insurance expiry
with compliance flags (task #185) and the supporting-statement field on payment claims (task
#92) — this area is well covered already; no gap identified here.

---

## 15. Recent and upcoming changes (as of July 2026) — worth monitoring

- **1 February 2026** — QBCC and Other Legislation Amendment Regulation 2026 ("Tranche 3" of
  the Building Reg Reno) commenced: clarified licence application vs. licence fee
  terminology, and — most consequentially for enforcement — added a **new infringement
  notice power** for breaches of **s109C** of the QBCC Act, set at 1 penalty unit
  ($154 for FY2025–26). This gives QBCC inspectors an on-the-spot fine option that didn't
  previously exist for that provision, without needing to commence formal prosecution.
- **1 February 2026** — QBCC shifted to **email as its primary communication channel** with
  licensees (licensing updates, defective-work decisions, QHWS correspondence, other
  notices). Licensees should keep their myQBCC email current — missing a notice due to a
  stale email address is not treated as an excuse.
- **21 January 2026** — the Queensland Productivity Commission released its final report on
  construction industry productivity, finding a 9% productivity decline since 2018
  (equivalent to ~77,000 fewer new homes). The Queensland Government has agreed or
  agreed-in-principle to 51 of 64 recommendations, including reducing administrative burden
  and reviewing regulator powers.
- **June 2026** — the Queensland Government announced a **separate ministerial review of
  QBCC itself**, following sustained criticism from industry and homeowners over how
  complaints and disputes are handled. Outcomes are not yet known as of this research.
- **Trust account rollout** remains paused pending the government's formal response to the
  Productivity Commission review (see §6) — the $10 million threshold has not moved yet but
  is explicitly under active policy review.

**Bottom line**: QBCC is in an unusually active reform period right now (three overlapping
review/reform tracks running concurrently in 2026). Treat any specific dollar threshold or
procedural detail in this document as correct as of the research date, but re-verify before
it drives a real compliance decision, and expect further regulation changes later in 2026.

Sources: [QBCC Licensing Changes 2026](https://bosslawyers.com.au/qbcc-licensing-changes-2026-what-queensland-builders-and-contractors-need-to-know/), [QBCC Under Review 2026](https://bosslawyers.com.au/qbcc-review-2026-queensland-builders/), [QBCC reforms underway support Productivity Commission recommendations](https://www.qbcc.qld.gov.au/news/qbcc-reforms-underway-support-productivity-commission-recommendations), [Landmark reforms to tackle construction industry productivity](https://www.treasury.qld.gov.au/newsroom/landmark-reforms-construction-industry/)

---

## 16. Summary — mapped against CivFlow's current build

| Obligation | CivFlow coverage today |
|---|---|
| Licence number on documents | Covered — printed reports, letterhead |
| Deposit cap (10%/5%/20%) | Covered — verify tier logic matches §4 exactly |
| Home warranty premium ($3,300 trigger) | Not tracked — candidate for a new compliance alert |
| MFR annual reporting deadline | Not tracked — candidate for a company-wide annual alert |
| BIF payment schedule (15-business-day) | Payment Claims register exists — confirm deadline alert wired in |
| Direction to Rectify (35-day clock) | Covered — DTR register exists |
| Notifiable incidents (WHSQ) | Covered — safety register; consider clarifying WHSQ vs WorkCover in UI copy |
| Subcontractor licence/insurance expiry | Covered |
| Variation client sign-off | Covered |
| Defects / Standards & Tolerances timeframes | Defects/NCR exist — could reference numeric tolerances and 12-month/6.5-year windows |
| CPD | Correctly not built — not yet a general requirement |
| Project Trust Accounts | Correctly not built — only relevant above $10M contracts, currently paused |

Two concrete gaps worth considering as future CivFlow features: **(1)** a home-warranty-
premium compliance flag once a project's contract value passes $3,300, mirroring the
existing deposit-cap check, and **(2)** an MFR annual-reporting-window reminder tied to the
company's declared financial category (Aug–Dec for Categories 1–7, Nov–Mar for SC1/SC2).
