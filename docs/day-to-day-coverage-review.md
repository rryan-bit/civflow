# CivFlow — day-to-day builder needs: coverage review

Research pass comparing what a small QLD/AU residential builder actually
does day to day against what CivFlow currently covers. Sources: general
site-supervisor/PM daily-task breakdowns, the two direct AU market
leaders for this exact customer (Buildxact and Tradify), the US category
leader for feature-completeness comparison (Buildertrend), and QBCC/HIA
contract requirements around delay records. Full source links at the
bottom.

**Update:** this doc was audited against the actual codebase (all 29
migrations + full route tree) after the initial market-research pass.
Three rows below had inaccurate verdicts and five real, already-built
capabilities were missing from the matrix entirely — most notably the
whole QBCC Compliance Health subsystem. Corrections are marked inline;
see "Audit corrections" for the full detail.

## Method

A "day in the life" of a small builder / site supervisor breaks into
roughly six buckets: site operations, client communication, money,
people, compliance, and the paper trail that protects the builder
contractually. For each bucket, this checks what's already built against
what the market considers table stakes.

## Coverage matrix

| Day-to-day need | Covered? | Where |
|---|---|---|
| Log today's progress, photos, voice note → structured record | Yes | Site diary + AI extraction |
| Weather conditions per day (for delay evidence) | Yes | `weather_logs`, auto-drafted by AI extraction |
| Materials ordered/delivered, short/damaged flags | Yes | Materials & Deliveries |
| Worker hours on site | Partial | Staff log hours via Worker Hours panel; field workers can only *view* their own hours — RLS actively blocks them from logging their own (see audit corrections) |
| Subcontractor register, contracts, SWMS, insurance/licence expiry | Yes | Subcontractors module + Compliance Health alerts |
| RFIs to designer/engineer | Yes | RFI register + AI-drafted RFIs |
| Variations, client sign-off | Yes | Variations + no-login client approval link |
| Progress claims (BIF Act) | Yes | Payment Claims + supporting statement |
| Safety register, toolbox talks, notifiable incidents | Yes | Safety module + AI toolbox talk drafting |
| Quality inspections / hold points | Yes | Inspections (ITP) |
| Non-conformance / defects tracking | Yes | Defects tied to Practical Completion; NCRs are a separate quality register tied to Inspections, not linked to PC |
| Practical completion, defects-liability, handover | Yes | Handover page |
| Milestones / high-level schedule | Partial | Milestone list + visual timeline, but no task dependencies or critical path |
| **Detailed program of works (sequencing trades, critical path)** | **No** | — |
| Job costing — budget vs actual by category | Partial | Financials page rolls up cost buckets + est. margin, but not a live per-cost-code budget the way a dedicated job-costing tool is |
| **Client selections (fixtures, finishes, allowances, approvals)** | **No** | — |
| Quoting / estimating from plans (takeoffs) | No (by design — Leads/quotes pipeline is freeform, not a takeoff tool) | — |
| Client communication (updates, questions) | Yes | AI-drafted updates, client portal, quote accept-links (`/quote/[token]`) — corrected: project chat is staff/subcontractor only, not client-facing (see below) |
| Team/crew communication | Yes | Messages (Team/project/group chat), Crew questions |
| Document storage (plans, contracts, certs) | Yes | Documents module |
| Tool & plant register | Yes | Equipment module (hire cost tracked but not yet fed into Financials — see audit corrections) |
| Accounting sync | Yes (just built) | Xero — invoices from payment claims, payment status back |
| **Extension of Time (EOT) claims for delays** | **No — data exists, no claim workflow** | Weather logs + `delay_reason` exist but there's no notice-tracking, no deadline countdown, no generated EOT document |
| Reporting across all jobs | Yes | Portfolio report + CSV export |
| Reminders / calendar of due dates | Yes | Calendar + reminders |
| **QBCC/BIF Act compliance tracking** | **Yes — oversight, not in original matrix** | Compliance Health engine, licence/MFR expiry, Directions to Rectify, BIF Act deposit cap and supporting-statement checks — see audit corrections |
| **In-app notifications + daily digest email** | **Yes — oversight, not in original matrix** | Notification bell + `notification_log` + Resend daily digest cron |
| **AI assistant (Q&A + actions)** | **Yes — oversight, not in original matrix** | Project-scoped and dashboard "Ask CivFlow" chat that can create leads, log orders/hours, surface compliance context |
| **Subcontractor self-service portal** | **Yes — oversight, not in original matrix** | No-login `/sub/[token]`: update insurance/licence, submit quotes, post progress + photos, acknowledge SWMS, chat |
| **Global search** | **Yes — oversight, not in original matrix** | Cross-entity search page |
| **Audit trail** | **Yes — oversight, not in original matrix** | `audit_log` table + trigger on nearly every mutable table since migration 0001 |

## What's genuinely missing

Three real gaps stood out, all things the market treats as standard and
none of which CivFlow has today:

**1. Client selections & allowances.** Every home-build competitor
(Buildertrend most explicitly) treats this as core: the client picks
tapware, tiles, paint colours, fixtures from options tied to a budget
allowance, approves with a signature, and it's supposed to flow straight
into the job cost. Right now a CivFlow builder has no way to present
choices to a client and get a tracked decision — it'd happen over email
or in person with nothing captured. This is a big one because it's a
near-daily interaction on any custom or semi-custom residential job, and
CivFlow already has all the surrounding pieces (client portal, sign-off
link pattern, financials) to bolt it onto.

**2. Extension of Time claims.** QBCC/HIA contracts require the builder
to formally notify the client of a delay (weather, third-party, etc.)
within a strict window — commonly 10 business days of becoming aware of
it — with supporting evidence, or risk losing the right to claim it.
CivFlow already logs the evidence that would support a claim (weather
per diary entry, delay reasons on milestones) but has no dedicated EOT
register: no "here's your delay, here's the clock ticking on when you
have to notify," no generated notice to send the client, no record that
it was sent and when. This is a real legal-protection gap specific to
the QLD/AU contract environment CivFlow is built for.

**3. A real program of works.** The current milestone timeline is good
for "here's roughly where things stand" but isn't a schedule — no task
dependencies, no critical path, no easy drag-to-reschedule when a trade
runs late and everything downstream shifts. Buildxact in particular
leans hard on this (auto-generates a schedule from the estimate and
flags the critical path). This was already flagged in an earlier
"what should we build next" pass — this research just confirms it's not
a nice-to-have, it's what every direct competitor treats as baseline.

## What's NOT actually missing (double-checked against the codebase)

A few things worth naming because they *sound* like gaps but aren't:
defects/punch-list tracking (covered via Defects + NCRs + handover),
weather record-keeping (covered, feeds AI extraction automatically),
tool/plant register (covered), and job costing at a basic level
(Financials rolls up materials/labour/subcontractor cost against
contract value — not a full per-cost-code ledger, but functional for a
small builder's day-to-day "are we on budget" question).

## Suggested priority

Client Selections first — it's the most universal day-to-day pain point
for exactly CivFlow's target builder, and it reuses existing patterns
(client portal, approval links, financials integration) rather than
needing new infrastructure. Extension of Time claims second — smaller
build, but closes a real legal-exposure gap specific to the regulatory
environment this product is built around. The full program-of-works
scheduler is the biggest lift of the three and worth its own dedicated
pass rather than folding into either of the above.

## Audit corrections

A full pass through all 29 migrations and the complete route tree
(staff, field worker, and public-portal) turned up three verdicts that
were wrong or overstated, and five real capabilities missing from the
matrix entirely.

**Wrong verdicts, corrected above:**

- *Worker hours "field worker self-logging"* — this was false. Migration
  0026 adds an explicit RLS policy blocking field workers from writing
  to `worker_time_entries` (`with check (not public.is_field_worker())`).
  The `/site` project page only ever displays hours, with no form to log
  them. Only staff can enter hours today, via the Worker Hours panel.
  If field workers logging their own time matters day to day (it
  probably should), that's a real small gap worth adding alongside
  Selections/EOT.
- *NCRs "tied to Practical Completion"* — only Defects actually surface
  on the Practical Completion page. NCRs are a separate register tied to
  Inspections with no cross-link to handover.
- *"Project chat" listed under client communication* — chat participants
  are staff or subcontractors only; there's no client chat participant
  type. The actual client-facing communication tools are the portal and
  the quote accept-link, which the original matrix didn't name.

**Complete oversights — built and working, but not in the original
matrix at all:**

- **QBCC Compliance Health** — the biggest miss. A real alert engine
  (`src/lib/compliance.ts`) covering licence and MFR expiry, Directions
  to Rectify, missing BIF Act supporting statements, unreleased
  retention, and subcontractor insurance/licence expiry, surfaced on a
  dashboard widget, a dedicated Compliance page, and a notification
  bell. Given the review leaned on QBCC/HIA sources throughout, this
  should have been the standout "already covered" item, not an
  afterthought.
- **In-app notifications + daily digest email** (Resend, cron-driven).
- **"Ask CivFlow" AI assistant** — project-scoped and dashboard-wide,
  can answer questions and take actions (create leads, log material
  orders, log hours).
- **Subcontractor self-service portal** (`/sub/[token]`) — no-login
  updates to insurance/licence, quote submission, progress photos, SWMS
  acknowledgment, chat.
- **Global search** and **audit trail** (internal, but real).

**Gaps re-confirmed as fully absent**, not just under-described: Client
Selections & Allowances, Extension of Time claims, and dependency-aware
scheduling all had zero hits searching the whole codebase for any
related table, route, or partial implementation.

## Sources

- [Residential Construction Management: Complete Guide](https://www.servicetitan.com/blog/residential-construction-management)
- [Buildertrend product overview](https://buildertrend.com/product-overview/)
- [Buildertrend Selections and Allowances Overview](https://buildertrend.com/help-article/selections-and-allowances-overview/)
- [Buildxact AU — job management & scheduling](https://www.buildxact.com/au/features/construction-scheduling-software/)
- [Best job management software for Australian tradies (2026)](https://besttradiesoftware.com/the-best-job-management-software-for-australian-tradies-2026/)
- [Delays in Construction Contracts in Qld — Complete Guide](https://stonegatelegal.com.au/delays-in-construction-contracts-in-qld-complete-guide/)
- [HIA — extensions of time and dealing with delays](https://hia.com.au/resources-and-advice/managing-your-business/dealing-with-contracts/articles/extensions-of-time-and-dealing-with-delays)
- [Contracts Specialist — HIA Contract Clause 19.2 extensions of time](https://www.contractsspecialist.com.au/articles/clause-19-2-hia-contract-extensions-of-time/)
