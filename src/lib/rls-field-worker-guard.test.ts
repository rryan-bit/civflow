import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------
// Static RLS regression guard — field-worker tenant isolation.
//
// This test does NOT touch a database. It reads every SQL file under
// supabase/migrations/ off disk and statically asserts that the field-worker
// deny model described in 0026_field_workers.sql actually holds across the
// whole migration set. It exists to catch, on every `vitest run`, the exact
// regression that migration's own CAVEAT warns about:
//
//   > the blanket-deny loop only sweeps tables that exist at the time this
//   > migration runs. Any table added by a LATER migration is NOT
//   > automatically locked down for field_workers — a future migration that
//   > adds a sensitive table should add its own
//   > `as restrictive ... using (not public.is_field_worker())` policy.
//
// Coverage model (mirrors how Postgres actually applies these policies):
//   * A company-scoped table created in migration <= 0026 (and NOT in that
//     migration's small allowlist) is covered by the one-time blanket-deny
//     sweep — no per-table policy needed.
//   * A company-scoped table created AFTER 0026 must carry its own explicit
//     `as restrictive ... not public.is_field_worker()` policy.
//
// The parsing is deliberately pragmatic (regex over a consistent SQL style),
// not a real SQL parser — see the task brief. If the SQL style ever drifts,
// tighten the regexes here rather than reaching for a parser.
// -----------------------------------------------------------------------------

const MIGRATIONS_DIR = fileURLToPath(new URL("../../supabase/migrations", import.meta.url));

// The migration that ran the one-time blanket field-worker deny sweep. Every
// table that existed at this point (bar the allowlist below) is already denied.
const BLANKET_SWEEP_MIGRATION = 26;

// Copied verbatim from 0026_field_workers.sql's allowed_tables array — the
// tables deliberately left OUT of the blanket deny because field workers
// legitimately need them (their own profile/company, their project
// assignments, the photos/questions they post, and their own linked worker +
// time-entry records, which get their own narrower restrictive policies).
// A separate assertion below checks this stays in sync with the migration.
const BLANKET_SWEEP_ALLOWLIST = new Set([
  "profiles",
  "companies",
  "project_workers",
  "worker_photos",
  "worker_questions",
  "workers",
  "worker_time_entries",
]);

// The maintained list of company-scoped tables that hold tenant financial /
// compliance / commercial data a field worker must get ZERO direct table
// access to. Tables field workers are *meant* to reach (their own hours, crew
// chat, the diary/safety read functions, etc.) are intentionally excluded.
//
// When you add a new tenant-data table in a future migration, add it here AND
// give it an `as restrictive ... not public.is_field_worker()` policy — this
// test will fail loudly if you do one without the other.
const MUST_DENY_FIELD_WORKERS = [
  // Core diary + AI extraction (field workers read these via SECURITY DEFINER
  // functions only; direct table access is denied).
  "diary_entries",
  "media_assets",
  "voice_notes",
  "labor_records",
  "equipment_records",
  "weather_logs",
  "safety_observations",
  "progress_notes",
  "client_reports",
  // Team / access control.
  "invites",
  // Operations + compliance registers.
  "rfis",
  "variations",
  "milestones",
  "directions_to_rectify",
  "payment_claims",
  "subcontractors",
  "swms",
  "inspections",
  "non_conformance_reports",
  "defects",
  "handover_items",
  // Subcontractor lifecycle + commercial.
  "subcontractor_quotes",
  "subcontractor_payments",
  "subcontractor_updates",
  "subcontractor_quote_items",
  // Cost / schedule / pipeline.
  "materials",
  "leads",
  "documents",
  "reminders",
  "assets",
  "asset_checkouts",
  "notification_log",
  // Client-facing commercial flows added after the blanket sweep.
  "selections",
  "selection_options",
  "eot_claims",
  "milestone_dependencies",
  "lead_notes",
  "lead_follow_ups",
];

interface MigrationFile {
  name: string;
  index: number; // numeric prefix, e.g. 0026 -> 26
  sql: string;
}

function loadMigrations(): MigrationFile[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((name) => {
    const match = name.match(/^(\d+)/);
    if (!match) throw new Error(`Migration file has no numeric prefix: ${name}`);
    return {
      name,
      index: Number(match[1]),
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"),
    };
  });
}

// First migration index at which each table is created via `create table X`.
function buildTableCreationMap(migrations: MigrationFile[]): Map<string, number> {
  const created = new Map<string, number>();
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi;
  for (const m of migrations) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(m.sql)) !== null) {
      const table = match[1].toLowerCase();
      if (!created.has(table)) created.set(table, m.index);
    }
  }
  return created;
}

// Tables that have an explicit `create policy ... on <table> as restrictive
// ... not public.is_field_worker()` somewhere in the migration set.
//
// Statement-oriented rather than one giant spanning regex: split each file on
// `;` (safe here — these policy expressions contain no inner semicolons), then
// keep only the create-policy statements that are BOTH restrictive AND
// reference the field-worker helper, and pull the `on <table>` out of each.
function buildExplicitDenySet(migrations: MigrationFile[]): Set<string> {
  const denied = new Set<string>();
  for (const m of migrations) {
    for (const stmt of m.sql.split(";")) {
      if (!/create\s+policy/i.test(stmt)) continue;
      if (!/as\s+restrictive/i.test(stmt)) continue;
      if (!/not\s+public\.is_field_worker\s*\(\s*\)/i.test(stmt)) continue;
      const onMatch = stmt.match(/\bon\s+([a-z_][a-z0-9_]*)\s+as\s+restrictive/i);
      if (onMatch) denied.add(onMatch[1].toLowerCase());
    }
  }
  return denied;
}

const migrations = loadMigrations();
const tableCreation = buildTableCreationMap(migrations);
const explicitDenies = buildExplicitDenySet(migrations);

function isCovered(table: string): { covered: boolean; via: string } {
  const createdAt = tableCreation.get(table);
  if (createdAt === undefined) return { covered: false, via: "table not found" };
  if (explicitDenies.has(table)) return { covered: true, via: "explicit restrictive deny" };
  if (createdAt <= BLANKET_SWEEP_MIGRATION && !BLANKET_SWEEP_ALLOWLIST.has(table)) {
    return { covered: true, via: `blanket sweep (created in ${createdAt})` };
  }
  return { covered: false, via: `created in ${createdAt}, no explicit deny` };
}

describe("field-worker RLS deny coverage (static migration audit)", () => {
  it("finds the migration set on disk", () => {
    expect(migrations.length).toBeGreaterThanOrEqual(36);
    expect(tableCreation.size).toBeGreaterThan(40);
  });

  it("every must-deny table actually exists in the schema (guards against renames/typos)", () => {
    const missing = MUST_DENY_FIELD_WORKERS.filter((t) => !tableCreation.has(t));
    expect(missing, `Listed as must-deny but never created: ${missing.join(", ")}`).toEqual([]);
  });

  it("every company-scoped tenant-data table denies field workers", () => {
    const gaps = MUST_DENY_FIELD_WORKERS.map((t) => ({ table: t, ...isCovered(t) })).filter((r) => !r.covered);
    expect(
      gaps,
      `Field-worker deny GAP — these tables are neither blanket-swept nor carry an explicit restrictive deny:\n` +
        gaps.map((g) => `  - ${g.table} (${g.via})`).join("\n"),
    ).toEqual([]);
  });

  it("every must-deny table created AFTER the blanket sweep carries its own explicit restrictive deny", () => {
    // This is the crown-jewel assertion: it directly guards the future-migration
    // risk called out in 0026's CAVEAT. A new post-0026 tenant table added
    // without a hand-written deny fails here.
    const postSweep = MUST_DENY_FIELD_WORKERS.filter((t) => (tableCreation.get(t) ?? 0) > BLANKET_SWEEP_MIGRATION);
    const missing = postSweep.filter((t) => !explicitDenies.has(t));
    expect(
      missing,
      `Post-0026 table(s) missing an explicit \`as restrictive ... not public.is_field_worker()\` policy: ${missing.join(", ")}`,
    ).toEqual([]);
    // Sanity: there really are post-sweep tables in the list, so this test has teeth.
    expect(postSweep.length).toBeGreaterThan(0);
  });

  it("the 0026 blanket-deny sweep is still present", () => {
    const sweep = migrations.find((m) => m.index === BLANKET_SWEEP_MIGRATION);
    expect(sweep, "0026_field_workers.sql not found").toBeTruthy();
    expect(sweep!.sql).toMatch(/field_worker_blanket_deny/);
    expect(sweep!.sql).toMatch(/as restrictive for all using \(not public\.is_field_worker\(\)\)/);
  });

  it("the hardcoded blanket-sweep allowlist matches 0026's actual allowed_tables array", () => {
    const sweep = migrations.find((m) => m.index === BLANKET_SWEEP_MIGRATION)!;
    const arrayMatch = sweep.sql.match(/allowed_tables\s+text\[\]\s*:=\s*array\[([\s\S]*?)\]/i);
    expect(arrayMatch, "could not locate allowed_tables array in 0026").toBeTruthy();
    const fromSql = new Set(
      Array.from(arrayMatch![1].matchAll(/'([a-z_][a-z0-9_]*)'/gi)).map((m) => m[1].toLowerCase()),
    );
    expect([...fromSql].sort()).toEqual([...BLANKET_SWEEP_ALLOWLIST].sort());
  });

  it("xero_connections is locked to the service-role client (RLS on, zero policies)", () => {
    // xero_connections holds live accounting OAuth tokens. It follows a
    // different (stricter) pattern than the field-worker deny: RLS enabled with
    // NO policies at all, so no browser-session role — field workers included —
    // can touch it. Guard that it never accidentally grows a policy.
    const file = migrations.find((m) => /create\s+table\s+xero_connections/i.test(m.sql));
    expect(file, "xero_connections migration not found").toBeTruthy();
    expect(file!.sql).toMatch(/alter\s+table\s+xero_connections\s+enable\s+row\s+level\s+security/i);
    const hasPolicy = /create\s+policy[\s\S]*?on\s+xero_connections/i.test(file!.sql);
    expect(hasPolicy, "xero_connections must have zero RLS policies (service-role only)").toBe(false);
  });
});
