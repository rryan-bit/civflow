# CivFlow RLS / tenant-isolation security audit — July 2026

**Scope:** static audit of database Row Level Security (RLS), multi-tenant
(`company_id`) isolation, the field-worker deny model, and the six public
token-based routes. Read against the SQL migration files
(`0001`–`0036`) and the application code as of 2026-07-19.

**Method:** there is no live Supabase/Postgres instance in this environment, so
everything below was verified by reading the migration SQL and app code
directly — not by querying `pg_policies` on a running database. Anything a live
test would have confirmed is instead reasoned from the migration source.

**Headline result:** **no high-confidence, exploitable tenant-isolation or
field-worker-scope gaps were found.** The migration set is internally
consistent; every post-`0026` tenant-data table that field workers must not see
carries its own restrictive deny, and every public token route scopes its
queries to the ID(s) resolved from that specific token. No `0037` fix migration
was created, because shipping redundant policies would add risk (a hand-applied
migration for Ryan to run) with no security benefit. A permanent static
regression test was added so this property is re-checked on every `vitest run`.

---

## 1. What was checked

### 1.1 Full table + RLS inventory

All **51 tables** across the 36 migrations were inventoried. Every one has
`enable row level security` (verified mechanically — zero tables without it).

Multi-tenancy is enforced one of a few consistent ways:

- **Direct** `company_id = public.current_company_id()` (e.g. `projects`,
  `reminders`, `assets`, `workers`, `leads`, `companies`, `profiles`).
- **Via `project_id`** → `projects.company_id`
  (e.g. `rfis`, `variations`, `milestones`, `payment_claims`, `subcontractors`,
  `documents`, `selections`, `eot_claims`, …).
- **Deeper joins** — `diary_entries` child tables join through
  `diary_entries → projects`; `selection_options` joins through
  `selections → projects`; `subcontractor_quote_items` joins through
  `subcontractor_quotes → projects`; `milestone_dependencies` joins through
  `milestones → projects`.

All the join-based policies were read and confirmed to terminate at
`company_id = public.current_company_id()`. No policy was found that scopes to a
bare `project_id`/`subcontractor_id` without ultimately checking the company.

### 1.2 Field-worker deny model (the known-fragile area)

`0026_field_workers.sql` runs a one-time blanket sweep: a
`field_worker_blanket_deny` restrictive policy
(`as restrictive ... using (not public.is_field_worker())`) is added to **every
table that existed at that point**, except a small allowlist of tables field
workers legitimately need:

```
profiles, companies, project_workers, worker_photos, worker_questions,
workers, worker_time_entries
```

(`workers` and `worker_time_entries` are excluded from the blanket sweep but
get their own *narrower* restrictive policies in the same migration — read-only,
and only their own linked record.)

The migration's own header CAVEAT is explicit that this sweep does **not** cover
tables created by later migrations. So every table introduced in `0027`–`0036`
was checked individually:

| Migration | New table(s) | Field-worker status | Verdict |
|-----------|--------------|---------------------|---------|
| 0027 | `chat_rooms`, `chat_participants`, `chat_messages` | Access **intentionally granted** to field workers for project/group chat, gated by `can_view_chat_room()` (assigned-project + participant checks). No restrictive deny — and none wanted. | Correct by design |
| 0028 | *(none — alters chat policies to let field workers into project/group chat)* | — | Correct by design |
| 0029 | `xero_connections` | RLS enabled, **zero policies at all** → deny-all for every browser-session role, field workers included. Only the service-role client can touch it. | Correct (stricter than a deny) |
| 0030 | *(none — RPCs only)* | — | n/a |
| 0031 | `selections`, `selection_options` | Explicit `as restrictive ... not is_field_worker()` on **both** | Correct |
| 0032 | `eot_claims` | Explicit restrictive deny | Correct |
| 0033 | `milestone_dependencies` | Explicit restrictive deny | Correct |
| 0034 | *(none — columns on pre-0026 `defects`/`projects`/`safety_observations`)* | Parent tables already blanket-swept | Correct |
| 0035 | `subcontractor_quote_items` | Explicit restrictive deny | Correct |
| 0036 | *(none — column on pre-0026 `asset_checkouts`)* | Parent table already blanket-swept | Correct |

Every sensitive post-`0026` table has its hand-written deny. The one-developer,
ten-migration manual discipline held.

### 1.3 Public token routes

The six no-login token routes were traced end to end:

`/portal/[token]`, `/quote/[token]`, `/sub/[token]`, `/vary/[token]`,
`/select/[token]`, `/join/[token]`.

Findings:

- The middleware allowlist (`src/lib/supabase/middleware.ts`) correctly marks
  all six path prefixes public and still redirects everything else to `/login`.
- **Every** page backing these routes reaches its data exclusively through
  `SECURITY DEFINER` RPCs keyed on the token:
  `get_project_portal_data`, `get_quote_by_token`, `get_variation_by_token`,
  `get_subcontractor_portal_data` (+ `get_subcontractor_chat_by_token`),
  `get_selection_by_token`, `get_invite_preview`.
- Each RPC resolves the owning row **by token first**, then scopes every
  sub-query to that resolved `id`/`project_id`/`subcontractor_id`. None of them
  match the token once and then query a table broadly. The write-side RPCs
  (`approve_variation_by_token`, `accept_quote_by_token`,
  `choose_selection_by_token`, `submit_subcontractor_*_by_token`,
  `acknowledge_swms_by_token`, `update_subcontractor_compliance_by_token`) all
  re-scope their `update`/`insert` to the token-resolved row
  (e.g. `where id = target_quote_id and subcontractor_id = s.id`).
- The `/portal` page's use of the **service-role admin client** is limited to
  minting signed URLs for the exact `storage_path` values returned by
  `get_project_portal_data` — which are themselves already scoped to the one
  project the token resolves to. No broad storage listing.
- The only non-RPC table access on a token page is `/join`, which reads the
  caller's **own** `profiles` row by `auth.uid()`. Fine.

### 1.4 Service-role usage elsewhere

Every `createAdminClient()` call site was reviewed (portal signed URLs, the two
crons, the `/admin` platform panel, and the Xero routes). The Xero push/
disconnect routes check the caller is an authenticated **admin of that company**
before using the admin client, and scope by `project.company_id` /
`profile.company_id`. The `/admin` panel is a deliberately separate,
platform-admin-gated, cross-company surface (`isPlatformAdmin(user.email)`).
Nothing here leaks one tenant's data to another tenant's normal session.

---

## 2. What turned out to be fine (and why it looked worth checking)

- **`chat_rooms` / `chat_participants` / `chat_messages` have no restrictive
  field-worker deny.** This is the most natural thing to flag as a "missed
  table" — but it's intentional: `0028` deliberately brought field workers into
  project/group chat, gated by `can_view_chat_room()` (assigned project +
  actual participant). A deny here would break a shipped feature. Not a bug.
- **`xero_connections` has no field-worker deny either** — because it has *no
  policies at all*. RLS-on-with-zero-policies denies everyone on a browser
  session, which is stricter than a field-worker deny and is the correct model
  for live OAuth tokens.
- **`milestone_dependencies` USING clause only checks the predecessor's
  company.** Theoretically asymmetric, but the INSERT `WITH CHECK` requires
  *both* predecessor and successor to be in the caller's company, so a
  cross-company dependency row can never exist to be leaked. Not exploitable.
- **`workers` / `worker_time_entries` are excluded from the blanket sweep.**
  Not a hole — they get their own narrower restrictive policies (field workers
  may read only their own linked record) plus the `log_my_hours` /
  `delete_my_hours` SECURITY DEFINER write path.
- **Public storage buckets** (`company-logos`, `subcontractor-uploads`) are
  world-readable by design; access to `subcontractor-uploads` writes is gated by
  a valid `portal_token` as the first path segment. Consistent with intent.

---

## 3. What was fixed

Nothing in the schema or app code required a fix. No `0037` migration was
written, and no application file was changed, because no real gap was found and
adding redundant policies would mean handing Ryan a migration to apply by hand
for zero security gain.

**Added (new file, non-schema):**
`src/lib/rls-field-worker-guard.test.ts` — a Vitest static regression guard. It
reads every file under `supabase/migrations/` with Node's `fs`, parses out
`create table` and restrictive-policy statements, and asserts that a maintained
list of "company-scoped tables field workers must be denied" is each covered
either by the `0026` blanket sweep (for pre-`0026` tables) or by an explicit
`as restrictive ... not public.is_field_worker()` policy (for post-`0026`
tables). Its crown-jewel assertion — *every must-deny table created after `0026`
carries its own explicit restrictive deny* — directly guards the exact
future-migration regression `0026`'s CAVEAT warns about. It also verifies the
blanket sweep still exists, that the hardcoded allowlist stays in sync with
`0026`'s actual `allowed_tables` array, and that `xero_connections` never grows
a policy. (Confirmed to have teeth: it fails if a post-`0026` deny is removed.)

---

## 4. What a human should double-check before shipping

Be honest — a static read can't see everything a live database would:

1. **Run the migrations against a real Postgres and dump `pg_policies`.** This
   audit assumes the migrations were applied cleanly and in order and that no
   policy was later altered/dropped directly in the Supabase dashboard (outside
   the migration files). If Ryan has ever edited policies by hand in the SQL
   editor, the live database may differ from what these files describe. The
   single most valuable follow-up is to compare live `pg_policies` against the
   migration set on the real project.
2. **Confirm no `field_worker` account has `role`/`company_id` it shouldn't.**
   The model relies on `profiles.role` and `project_workers` assignments being
   correct. A misassigned account is a data-model problem RLS can't catch.
3. **Confirm `SUPABASE_SERVICE_ROLE_KEY` is only ever set server-side.** The
   entire admin-client trust boundary (portal signed URLs, crons, Xero, `/admin`)
   assumes that key never reaches the browser. Worth a one-line check of the
   deploy env.
4. **The `subcontractor-uploads` / `company-logos` buckets are public-read.**
   That's intentional, but it means anyone with a file's full path can read it.
   Nothing sensitive should be uploaded to those buckets under a guessable path
   (current paths use random UUIDs / the company UUID / the portal token, which
   is fine). Worth keeping in mind for any future upload feature.
5. **The regression test guards the *pattern*, not the *semantics*.** It proves
   each sensitive table has a deny policy; it can't prove the policy's predicate
   is logically correct against live data. New tables still need a human to
   decide whether they belong on the `MUST_DENY_FIELD_WORKERS` list — and to add
   them there — when they're created.

---

*Prepared as a pre-launch static audit. Companion to
`docs/qbcc-compliance-gap-analysis.md`.*
