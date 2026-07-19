# CivFlow — AI Site Diary Assistant (MVP)

A Progressive Web App for civil contractors: a supervisor captures site
photos, a voice note, and any documents; CivFlow will draft the site diary,
labor log, equipment log, weather log, and safety observations automatically.
This is Stage 1 of the CivFlow roadmap — see
`CivFlow_MVP_Technical_Plan.docx` in the outputs folder for full context.

**Status:** Phase 0 (foundations), Phase 1 (capture), and Phase 2 (AI
extraction) are built. Phase 3 (a proper review/edit UI, PDF export, client
email delivery) is next.

## What's here

- Next.js 16 (App Router) + TypeScript + Tailwind, configured as an
  installable PWA (manifest + service worker).
- Supabase for Postgres, auth, and file storage.
- Email/password auth with company-scoped row-level security.
- Project creation, a project list, and a diary-entry capture screen
  (photo upload, in-browser voice recording, document upload).
- An entry detail page with a **Run AI extraction** button: transcribes the
  voice note (if `OPENAI_API_KEY` is set), sends the transcript + photos to
  Claude, and drafts labor, equipment, weather, and safety records. An
  **Approve entry** button flips the entry to `approved` once reviewed.
- A redesigned dashboard: stat cards, an in-app reminder for any active
  project that hasn't had an entry logged today, and a recent-activity feed.
- **Ask CivFlow** on the dashboard: a company-wide AI chat that can create a
  new project from a freeform description (client, address, subcontractors,
  key dates) or log something — a materials delivery, hours worked, an RFI,
  a variation, a payment claim, and more — against any existing project by
  name, all without opening the project first. The same assistant lives
  inside each project too (scoped to just that project's data).
- Edit/delete for projects and diary entries.
- Team invite links: an admin generates a one-time link from the **Team**
  page, sends it however they like, and whoever opens it joins the company
  at the assigned role — no manual SQL required for teammates after setup.
- No-login client links: a shareable variation approval link (`/vary`), a
  quote accept link (`/quote`), and a read-only project portal (`/portal`)
  showing a progress history with photos, a payment summary, milestones,
  variations awaiting approval, and any documents flagged "Share with
  client" — none require the client to have a CivFlow account.
- An optional daily digest email (compliance alerts, due/overdue reminders,
  and projects missing today's diary entry), sent once a day by a Vercel
  Cron job if `RESEND_API_KEY` is configured.
- A one-click **Client Report** per project (`/projects/<id>/report`):
  contract & billing summary, schedule, milestones, variations, payment
  claims, trades on site, and a progress history, laid out as a printable
  document — click Print / Save as PDF to get a file to email a client who
  asks "where are we up to?". Same scope decision as the client portal: no
  internal cost breakdowns or estimated margin. A **Draft an update** button
  on the same page asks Claude to turn the latest logged progress,
  milestones, and pending variations into a short plain-language client
  update, editable before you copy it out.
- A no-login **Subcontractor portal** (`/sub/<token>`, linked from each
  subcontractor's detail page): the subbie sees their contract summary and
  payment history, can update their own insurance/licence expiry dates,
  acknowledge SWMS documents, and submit a progress claim — no account
  needed. Expiring/expired subcontractor insurance and licences also now
  show up as Compliance Health alerts. They can also respond to a quote the
  builder requested (or submit an unsolicited one) with an attached file,
  and post free-text progress updates with an optional photo — both show up
  automatically in a **Subcontractor activity** card on the project
  homepage and on the subcontractor's own detail page, no chasing required.
- A visual **schedule timeline** on each project's Financials page — every
  milestone plotted along the project's start-to-completion axis,
  color-coded by status, with a "today" marker.
- A **notification bell** in the app header: the same compliance alerts,
  due/overdue reminders, and "no diary entry logged today" checks as the
  daily digest email, computed live so it's always current.
- **Task assignment**: RFIs, Directions to Rectify, and NCRs can each be
  assigned to a team member from their detail page; the dashboard's **My
  open items** widget shows everything assigned to you across every
  project.
- **Field worker accounts** (`/site`): a lightweight, real login for on-site
  crew — invited from a project's new **Crew** module (or added there if
  they already have an account) the same way any teammate is, but scoped to
  just the project(s) they're assigned to. They see a read-only site diary
  and safety register, their own logged hours, and can post site photos and
  ask the builder questions — nothing else (financials, other projects,
  RFIs, and everything else stay off limits, enforced at the database
  level, not just hidden in the UI). Their photos and questions show up on
  the project's **Crew** page for the builder to review and answer.
- A company-wide **Portfolio report** (`/reports`): every project's
  contract value, billing progress, schedule variance, and open compliance
  alerts in one table, with a **Download CSV** button for spreadsheet
  export.
- A **Xero integration** (Compliance page, admin only): connect your own
  Xero organisation via OAuth — no cost to CivFlow or you beyond whatever
  Xero subscription you already have — then push any payment claim to Xero
  as an invoice with one click from its detail page. A daily job checks
  back with Xero and marks the claim paid in CivFlow once Xero says the
  invoice is settled, so you're not re-entering the same payment twice.
  Requires `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` / `XERO_REDIRECT_URI`
  from a free Xero Developer app registration (see `.env.local.example`)
  and a client name on the project (Edit project) for Xero to invoice.
- **Company branding**, from the Compliance page's "Company profile" card
  (admin only): rename the company, and upload a logo that replaces the
  CivFlow mark on every printed document — diary entries, variations, and
  the client report.
- Unanswered **field worker questions** now surface company-wide on the
  dashboard, not just on each project's Crew page — a "Questions from the
  crew" widget lists every open one across every project with a reply box
  right there, so nothing sits unanswered because no one thought to check a
  specific project.
- A proper **Messages** tab (top-level nav, next to Team): a conversation
  list — Team chat, every project's own chat, and any named group chat —
  each with a last-message preview, and a **New chat** flow to open a
  project's chat or start a group with specific team members (and, for a
  project-scoped group, the workers assigned to it). Open one to get a full
  thread with a participants panel to add or remove people, and a Leave
  option on anything other than Team chat. Subcontractors who've been added
  to a project chat see and reply to it from their existing `/sub/<token>`
  portal link, no account needed. Field workers now get messages too, but
  scoped to their own world: they're automatically in their assigned
  project's chat alongside the office, and can start their own group chats
  with other crew or staff on that project from a **Messages** tab in their
  `/site` area — they still never see the company-wide Team chat or any
  other project's conversations.
- Field workers can now **log their own hours** from `/site` — previously
  they could only view hours a supervisor had entered. Same-day entries
  they logged themselves can be removed if they made a mistake; anything
  older, or entered by staff, stays supervisor-only to edit.
- **Client Selections & Allowances** (project hub → Selections): builder
  adds a category (e.g. "Kitchen tapware"), a budget allowance, and a set
  of priced options; sends the client a no-login `/select/<token>` link to
  pick one and confirm with their name. Pending and chosen selections
  surface on the client portal too, and a chosen option's cost feeds into
  the Financials page's margin estimate and allowance-variance card.
- **Extension of Time claims** (project hub → Extension of Time): tracks a
  delay's cause, when the builder became aware of it, and the notice
  deadline (defaults to 10 business days out, the common HIA/QBCC window —
  editable per the actual contract clause). Generates a printable notice
  letter, records when it was actually sent, and Compliance Health flags
  claims whose notice deadline is close or already missed.
- **Dependency-aware scheduling** (Milestones page): give a milestone a
  duration and mark which other milestones it depends on; a Gantt-style
  chart computes the real critical path (which milestones have zero slack
  and are actually driving the finish date, versus which have room to
  slip) via a small unit-tested CPM engine in `src/lib/schedule-calcs.ts`.
- A platform-wide **admin control panel** at `/admin` — separate from
  everything else in the app, gated to a small hardcoded email allowlist
  (`src/lib/admin-access.ts`, defaults to just the founder's email; add
  more via `PLATFORM_ADMIN_EMAILS`) rather than a database role, since
  every other permission boundary in CivFlow is deliberately scoped to one
  company and this is the one place that needs to see across all of them.
  Read-only by design: platform-wide stats, a signups-per-week chart, every
  company with user/project counts and last-active date, a per-company
  drill-down, and a searchable list of every user across every company.
  Powered by the service-role admin client, so it bypasses RLS entirely —
  requires `SUPABASE_SERVICE_ROLE_KEY` to be set.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of `supabase/migrations/0001_init.sql`.
   This creates every table, the row-level security policies, and the
   `diary-media` storage bucket.
3. Then run `supabase/migrations/0002_invites.sql` (team invite links),
   `0003_operations.sql` (RFIs, variations, milestones, audit trail),
   `0004_rate_limiting.sql` (per-user AI usage caps),
   `0005_qbcc_compliance.sql` (QBCC licence/MFR tracking, Directions to
   Rectify register, notifiable incident fields), and
   `0006_pm_lifecycle.sql` (payment claims, subcontractors, SWMS, quality
   inspections, non-conformance reports, practical completion/handover),
   `0007_reminders.sql` (custom reminders shown on the dashboard and
   calendar), `0008_subcontractor_lifecycle.sql` (subcontractor quotes,
   contract/award, progress payments with retention, completion and
   retention release, plus BIF Act supporting statement tracking on
   payment claims), `0009_cost_schedule_analytics.sql` (contract
   value + planned dates on projects, actual completion/delay reason on
   milestones — feeds the Financials & Schedule page and dashboard
   rollups), `0010_company_type.sql` (adds `companies.company_type`
   plus a `create_company()` function — this is what powers the new
   `/onboarding` flow, since until now a company could only be created
   directly in Supabase), `0011_materials_deliveries.sql` (materials
   ordered/received per project, with short/damaged delivery flags),
   `0012_asset_register.sql` (company-wide tool & hired-plant register
   with checkout/return tracking), `0013_worker_time_tracking.sql`
   (named workers, no login needed, with daily hours logged per
   project), `0014_documents.sql` (a flat per-project document library —
   contracts, insurance, plans, permits — reusing the existing
   `diary-media` storage bucket under a `documents/` prefix), and
   `0015_leads.sql` (a pre-project leads/quotes pipeline that can
   convert a won lead straight into a project), `0016_deposit_cap.sql`
   (adds `projects.deposit_amount`, used to flag deposit cap breaches on
   domestic building contracts — a tiered check, 10% under $20,000 and 5%
   at/above, under the QBCC Act's Domestic Building Contracts provisions
   (Schedule 1B); the tiering and correct citation were fixed in the 0034
   compliance audit — see below), and
   `0017_variation_signoff.sql` (adds a no-login client approval link for
   variations — `/vary/<token>` — plus who-requested-it/reason fields and a
   `work_started` flag, so a variation's cost has actual written client
   sign-off behind it instead of just an internal staff "approved" click),
   `0018_lead_quote_signoff.sql` (a no-login client accept-link for a sent
   quote — `/quote/<token>` — mirroring the variation sign-off pattern),
   `0019_project_portal.sql` (a no-login, read-only client project portal —
   `/portal/<token>` — showing progress, milestones, payment claims, and
   variations awaiting approval, deliberately excluding photos since the
   storage bucket policy requires a logged-in user), and
   `0020_notifications.sql` (adds `profiles.email` so the daily digest cron
   can reach people without querying `auth.users`, plus a `notification_log`
   table so a cron that fires twice doesn't double-send), and
   `0021_portal_enhancements.sql` (adds `documents.client_visible` so a
   document can be flagged shareable, and extends the portal's data function
   with a financial summary, a fuller progress history, and photo/document
   storage paths for the client portal), `0022_subcontractor_portal.sql`
   (adds a no-login subcontractor portal — `/sub/<token>` — where a subbie
   can view their contract summary and payment history, update their
   insurance/licence expiry dates, acknowledge a SWMS, and submit a progress
   claim, all without a CivFlow account), `0023_task_assignment.sql`
   (adds `assigned_to` to Directions to Rectify and Non-Conformance Reports
   so they can be assigned to a team member the same way RFIs already could),
   `0024_company_branding.sql` (adds `companies.logo_storage_path` and a
   public `company-logos` storage bucket, so a company can rename itself and
   upload a logo that replaces the CivFlow mark on printed documents), and
   `0025_subcontractor_uploads.sql` (lets a subcontractor submit a quote
   with an attached file and post a free-text progress update with an
   optional photo from their `/sub/<token>` link — adds a
   `subcontractor_updates` table, a public `subcontractor-uploads` storage
   bucket scoped to each subcontractor's own token, and portal-specific
   rate limiting since these are anonymous writes), and
   `0026_field_workers.sql` (adds a `field_worker` profile role for on-site
   crew — real logins, but scoped to just their assigned project(s) via a
   new `project_workers` table, with a blanket RESTRICTIVE row-level-security
   policy that locks the role out of every other table by default rather
   than hand-editing each existing policy; adds `worker_photos` and
   `worker_questions`, `workers.linked_profile_id` to connect a login to a
   labour-tracking record, and two SECURITY DEFINER functions —
   `get_field_worker_home()` / `get_field_worker_project_data()` — that
   power their `/site` view), `0027_chat.sql` (adds a company-wide
   Team chat — everyone on staff is a member automatically, no invite
   needed — and a per-project chat with explicit membership via a
   `chat_participants` table, so an admin can loop in specific team
   members and subcontractors for a given job; subcontractors reach it
   through their existing no-login `/sub/<token>` link once added, via
   token-scoped `get_subcontractor_chat_by_token()` /
   `post_subcontractor_chat_message_by_token()` functions), and
   `0028_chat_groups_and_worker_access.sql` (adds a third `chat_rooms.kind`,
   `'group'` — a named, freeform chat anyone can start and pick specific
   people for — and lets field workers into chat for the first time,
   scoped to their assigned project(s) only: they're pulled into the same
   auto per-project chat as staff via `get_or_create_worker_project_chat_room()`,
   and can start their own group chats with other workers or staff on that
   project via `create_group_chat()`, which validates every member server
   -side so a worker can't loop in someone who has no business being in
   it. A single `can_view_chat_room()` SECURITY DEFINER function is now the
   one place both staff and field-worker visibility rules live, replacing
   the four separate policies 0027 had per table. Field workers still
   never see the company-wide Team chat.), and `0029_xero_integration.sql`
   (adds `xero_connections` — one row per company holding that company's own
   Xero OAuth tokens, RLS-enabled with zero policies for the `authenticated`
   role at all, so the only way in or out is the service-role admin client
   from a server route that's already checked the caller is an admin;
   `get_xero_connection_status()` is the safe, token-free way the UI checks
   whether a company is connected; adds `projects.client_name` /
   `client_email` / `xero_contact_id`, since a Xero invoice needs a contact
   and projects previously had no client fields at all, and
   `payment_claims.xero_invoice_id` / `xero_invoice_status` / `xero_synced_at`),
   `0030_worker_self_logged_hours.sql` (adds `log_my_hours()` / `delete_my_hours()`
   SECURITY DEFINER functions so a field worker can log — and same-day
   correct — their own hours against a project they're assigned to, without
   granting them a direct table-level write on `worker_time_entries`; widens
   `get_field_worker_project_data()`'s `my_hours` to include each entry's id
   and a `can_remove` flag),
   `0031_selections.sql` (adds `selections` and `selection_options` —
   fixtures/finishes a client picks from, against a budget allowance, via
   the same no-login token-link pattern as variations: `/select/<token>`,
   `get_selection_by_token()` / `choose_selection_by_token()`; extends
   `get_project_portal_data()` with `selections_awaiting_choice` /
   `selections_chosen` so pending selections surface on the existing client
   portal too),
   `0032_eot_claims.sql` (adds `eot_claims` — an Extension of Time register:
   delay cause, the date the builder became aware of it, a notice deadline
   commonly 10 business days out under HIA/QBCC, and whether/when notice was
   actually sent — deliberately not another client-approval token flow,
   since an EOT notice is something the builder is required to send, not
   something that needs the client to click "approve" in the app), and
   `0033_milestone_dependencies.sql` (adds `milestones.duration_days` and a
   `milestone_dependencies` predecessor/successor table, enabling a real
   critical-path schedule — computed client-side in `src/lib/schedule-calcs.ts`,
   a pure unit-tested CPM implementation, rather than in SQL; cycle
   prevention happens in the app layer before a dependency row is ever
   inserted, since Postgres has no built-in DAG constraint), and
   `0034_compliance_gap_fixes.sql` (three columns arising from a side-by-side
   audit of CivFlow against QBCC's own guidance — see
   `docs/qbcc-compliance-gap-analysis.md`: `defects.defect_type`
   structural/non-structural, since QBCC gives each a very different claim
   window; `projects.home_warranty_premium_paid` /
   `home_warranty_premium_paid_date`, since the Home Warranty Insurance
   premium — mandatory over $3,300 — had no tracking at all; and
   `safety_observations.workcover_notified_at` / `workcover_reference`, since
   WHSQ notification and WorkCover Queensland notification are separate
   regulators that the previous single "reported" checkbox conflated), and
   `0035_subcontractor_quote_items.sql` (adds `subcontractor_quote_items` —
   itemised line items under a subcontractor quote, since the AI
   document-filing route was only extracting a single headline total and
   discarding the individual scope/cost breakdown a real quote or invoice
   usually has), and `0036_asset_checkout_cost.sql` (adds
   `asset_checkouts.total_cost`, the cost of one specific hire/checkout
   period — e.g. from a hire invoice, or entered manually against the
   project it's checked out to — distinct from `assets.hire_cost_per_day`,
   which is just a general reusable daily rate for the asset; real hire
   invoices often bundle a day-rate with delivery fees or a damage waiver
   into one figure that shouldn't be forced to divide cleanly, so it's
   stored as a single per-checkout total)
   — in that order, each one depends on tables from the ones before it.

   The AI document-filing route (`documents/ai-file/route.ts`) was also
   extended off the back of real-world testing: subcontractor quotes now
   pull the subcontractor's own QBCC licence number and contact details
   (backfilled onto the subcontractor record without ever overwriting a
   field someone entered manually) plus every itemised line the source
   document shows, not just the total; and a new `equipment_hire` record
   type recognises plant/tool/scaffolding hire invoices, creating or
   reusing an entry in the Tools & Plant register (`assets`) with a linked
   `asset_checkouts` row for the hire period and cost, per item on the
   invoice. Any checkout with a cost recorded — whether filed by the AI
   from an invoice or entered manually on the Equipment page — now rolls
   into that project's Financials (both the dedicated Financials page and
   the project hub's summary widget): folded into the cost breakdown chart,
   the estimated margin calculation, and its own "Equipment & plant hire"
   stats card.

   A brand-new signup with no invite link is sent to `/onboarding` to
   create their company and choose "small residential builder" (hides
   Directions to Rectify, formal ITP inspections, and NCRs from every
   project by default) or "civil / commercial contractor" (full
   toolset). This can be changed later by an admin from the Compliance
   page.
4. In Project Settings → API, copy the **Project URL** and **anon public
   key**.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with
the values from step 1.

To use the **Run AI extraction** button, also set `ANTHROPIC_API_KEY` (get
one at [console.anthropic.com](https://console.anthropic.com/settings/keys)).
Optionally set `OPENAI_API_KEY` too, so voice notes get transcribed — without
it, extraction still runs, just from photos alone.

Set `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → `service_role`
key) to enable the daily digest cron job (it needs to read across every
company with no user session) and the client portal's photos/documents
sections (the storage bucket requires an authenticated role, so the portal
page mints signed URLs server-side with this key). Without it, the cron
route no-ops and the portal simply shows no photos/documents sections.
Keep this key secret; it bypasses row-level security entirely.

To actually receive daily digest emails, also set `RESEND_API_KEY` (get one
at [resend.com/api-keys](https://resend.com/api-keys)), `DIGEST_FROM_EMAIL`
(a sender address on a domain verified in Resend), and `CRON_SECRET` (any
long random string — `openssl rand -hex 32` works) so Vercel Cron can
authenticate its request. Without `RESEND_API_KEY`, the cron route still
runs on schedule but sends nothing.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account
— new accounts aren't linked to a company yet, so you'll see a banner asking
an admin to assign one.

## 4. Create your first company and link your account

Run this once in the Supabase SQL Editor (replace the email):

```sql
insert into companies (name) values ('Your Company Name') returning id;

-- copy the id from above, then:
update profiles
set company_id = '<the-id-above>', role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Refresh the app — you should now be able to create a project and start a
site diary entry.

## 5. Inviting teammates

Once you're an admin, go to the **Team** tab in the app, pick a role, and
click **Generate invite link**. Send that link to your teammate however you
like — when they open it, sign up (or sign in), and click **Join company**,
they're linked to your company at that role automatically. Each link expires
after 7 days and can only be used once.

## Roadmap (from the technical plan)

- **Phase 3 — Review & output:** a proper edit UI for the AI's draft (right
  now you can view it, but not correct individual fields), PDF generation,
  and client email delivery.
- **Phase 4 — Pilot polish:** auto-fetched weather by site location/date,
  better error handling, and onboarding for the first 1–2 pilot contractors.

## Deploying

This deploys cleanly to [Vercel](https://vercel.com/new) — connect the repo
and add the same environment variables from `.env.local` in the Vercel
project settings.

`vercel.json` schedules the daily digest cron job for 21:00 UTC (07:00
AEST/Queensland time) — Vercel calls it automatically once deployed, no
extra setup needed beyond the `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`DIGEST_FROM_EMAIL`, and `CRON_SECRET` env vars above.
