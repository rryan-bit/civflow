import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { daysBetween, addDaysToDate } from "@/lib/dates";
import { checkDepositCap } from "@/lib/financial-calcs";

// Accepts either the cookie-based SSR client (normal page/API-route
// requests) or the service-role admin client (the cron job, which has no
// user session at all) — both satisfy this shape.
type SupabaseServerClient = SupabaseClient<Database>;

export type ComplianceSeverity = "red" | "amber";

export type ComplianceAlert = {
  severity: ComplianceSeverity;
  message: string;
  href: string;
  /** Unset for company-wide alerts (licence, MFR) that aren't tied to a
   * single project — set on everything else so callers can group by
   * project (see the Compliance page's "by project" breakdown). */
  projectId?: string;
  projectName?: string;
};

/**
 * Computes real, data-driven compliance risk for a company — the "Compliance
 * Health" check. Everything here is derived from what the builder has
 * actually recorded (a Direction to Rectify overdue, a payment claim missing
 * its BIF Act supporting statement, a licence about to lapse, a deposit over
 * the statutory cap) rather than generic advice. This is intentionally a
 * tracking aid, not a compliance guarantee — see the disclaimers on the
 * pages that render it.
 */
export async function getComplianceAlerts(
  supabase: SupabaseServerClient,
  companyId: string | null
): Promise<ComplianceAlert[]> {
  if (!companyId) return [];

  const alerts: ComplianceAlert[] = [];

  const [{ data: company }, { data: projects }] = await Promise.all([
    supabase
      .from("companies")
      .select("qbcc_licence_expiry, mfr_category, mfr_report_due_date")
      .eq("id", companyId)
      .single(),
    supabase
      .from("projects")
      .select("id, name, status, contract_value, deposit_amount, home_warranty_premium_paid")
      .eq("company_id", companyId)
      .eq("status", "active"),
  ]);

  // --- Company licence & MFR reporting -------------------------------
  if (company?.qbcc_licence_expiry) {
    const days = daysBetween(company.qbcc_licence_expiry);
    if (days < 0) {
      alerts.push({ severity: "red", message: `QBCC licence expired ${Math.abs(days)}d ago.`, href: "/compliance" });
    } else if (days <= 60) {
      alerts.push({ severity: "amber", message: `QBCC licence expires in ${days}d.`, href: "/compliance" });
    }
  }

  if (company?.mfr_report_due_date) {
    const days = daysBetween(company.mfr_report_due_date);
    if (days < 0) {
      alerts.push({ severity: "red", message: `MFR report overdue by ${Math.abs(days)}d.`, href: "/compliance" });
    } else if (days <= 30) {
      alerts.push({ severity: "amber", message: `MFR report due in ${days}d.`, href: "/compliance" });
    }
  }

  const activeProjects = projects ?? [];
  const projectIds = activeProjects.map((p) => p.id);
  const projectName = (id: string) => activeProjects.find((p) => p.id === id)?.name ?? "a project";

  // --- Domestic building contract deposit cap (QBCC Act Sch 1B) --------
  // Note: this is the Domestic Building Contracts regime (now Schedule 1B
  // of the QBCC Act, formerly its own Act), not the BIF Act — a mislabel
  // fixed during the July 2026 compliance audit. The cap is tiered: 10%
  // for contracts $3,301–$19,999, 5% for $20,000+.
  for (const p of activeProjects) {
    const { breached, percent, capRate } = checkDepositCap(p.contract_value, p.deposit_amount);
    if (breached && percent !== null && capRate !== null) {
      alerts.push({
        severity: "red",
        message: `${p.name}: deposit is ${percent.toFixed(1)}% of the contract — over the ${capRate}% cap for domestic building contracts at this value (QBCC Act Sch 1B).`,
        href: `/projects/${p.id}/financials`,
        projectId: p.id,
        projectName: p.name,
      });
    }
  }

  // --- Home Warranty Insurance premium not yet remitted -----------------
  // Mandatory on residential contracts over $3,300; must be collected and
  // remitted to QBCC within 10 business days of signing. Flagged as amber
  // rather than red since CivFlow can't confirm the 10-business-day clock
  // has actually lapsed (no contract-signed-date field), only that the
  // contract is large enough to require it and it hasn't been marked paid.
  for (const p of activeProjects) {
    if (typeof p.contract_value === "number" && p.contract_value > 3300 && !p.home_warranty_premium_paid) {
      alerts.push({
        severity: "amber",
        message: `${p.name}: Home Warranty Insurance premium not yet marked as paid — mandatory on residential contracts over $3,300, due within 10 business days of signing.`,
        href: `/projects/${p.id}/financials`,
        projectId: p.id,
        projectName: p.name,
      });
    }
  }

  if (!projectIds.length) return alerts;

  // --- Directions to Rectify -------------------------------------------
  const { data: dtrs } = await supabase
    .from("directions_to_rectify")
    .select("id, project_id, description, due_date, status")
    .in("project_id", projectIds)
    .in("status", ["open", "overdue"]);

  for (const d of dtrs ?? []) {
    const days = daysBetween(d.due_date);
    if (days < 0) {
      alerts.push({
        severity: "red",
        message: `${projectName(d.project_id)}: Direction to Rectify overdue by ${Math.abs(days)}d — "${d.description}".`,
        href: `/projects/${d.project_id}/directions-to-rectify/${d.id}`,
        projectId: d.project_id,
        projectName: projectName(d.project_id),
      });
    } else if (days <= 7) {
      alerts.push({
        severity: "amber",
        message: `${projectName(d.project_id)}: Direction to Rectify due in ${days}d — "${d.description}".`,
        href: `/projects/${d.project_id}/directions-to-rectify/${d.id}`,
        projectId: d.project_id,
        projectName: projectName(d.project_id),
      });
    }
  }

  // --- Payment claims: missing supporting statement + past due date ----
  // A single query covering both checks — querying payment_claims twice
  // with different filters isn't necessary and complicates testing, so
  // both alerts are derived from the one result set.
  const { data: claims } = await supabase
    .from("payment_claims")
    .select("id, project_id, claim_number, amount_claimed, status, supporting_statement_provided, due_date")
    .in("project_id", projectIds)
    .in("status", ["submitted", "schedule_received"]);

  for (const c of claims ?? []) {
    const claimLabel = c.claim_number ? `"${c.claim_number}"` : "payment claim";

    if (c.status === "submitted" && !c.supporting_statement_provided) {
      alerts.push({
        severity: "amber",
        message: `${projectName(c.project_id)}: payment claim ${claimLabel} for $${c.amount_claimed.toLocaleString()} has no BIF Act supporting statement recorded yet.`,
        href: `/projects/${c.project_id}/payment-claims/${c.id}`,
        projectId: c.project_id,
        projectName: projectName(c.project_id),
      });
    }

    // Past its BIF Act due date — the next step is usually adjudication.
    // Not previously surfaced in company-wide compliance health, only on
    // the claim's own detail page.
    if (c.due_date) {
      const days = daysBetween(c.due_date);
      if (days < 0) {
        alerts.push({
          severity: "red",
          message: `${projectName(c.project_id)}: ${claimLabel} for $${c.amount_claimed.toLocaleString()} is ${Math.abs(days)}d overdue — consider escalating to adjudication under the BIF Act.`,
          href: `/projects/${c.project_id}/payment-claims/${c.id}`,
          projectId: c.project_id,
          projectName: projectName(c.project_id),
        });
      } else if (days <= 3) {
        alerts.push({
          severity: "amber",
          message: `${projectName(c.project_id)}: ${claimLabel} for $${c.amount_claimed.toLocaleString()} is due in ${days}d.`,
          href: `/projects/${c.project_id}/payment-claims/${c.id}`,
          projectId: c.project_id,
          projectName: projectName(c.project_id),
        });
      }
    }
  }

  // --- Variations: work started with no documented client sign-off -----
  // The single most common cause of a variation dispute: the builder did
  // the extra work, but there's no written record the client agreed to the
  // scope/cost first. Under the Domestic Building Contracts Act this can
  // mean the cost isn't recoverable at all if it's challenged.
  const { data: riskyVariations } = await supabase
    .from("variations")
    .select("id, project_id, title, cost_impact, client_name")
    .in("project_id", projectIds)
    .eq("work_started", true)
    .is("client_approved_at", null);

  for (const v of riskyVariations ?? []) {
    const costText = typeof v.cost_impact === "number" ? ` ($${v.cost_impact.toLocaleString()})` : "";
    alerts.push({
      severity: "red",
      message: `${projectName(v.project_id)}: work has started on "${v.title}"${costText} with no client sign-off recorded — this cost may not be recoverable if disputed.`,
      href: `/projects/${v.project_id}/variations/${v.id}`,
      projectId: v.project_id,
      projectName: projectName(v.project_id),
    });
  }

  // --- Subcontractor retention not released after completion -----------
  const { data: subs } = await supabase
    .from("subcontractors")
    .select("id, project_id, company_name, completion_date, retention_percentage, retention_released_date, contract_value")
    .in("project_id", projectIds)
    .not("completion_date", "is", null)
    .is("retention_released_date", null)
    .not("retention_percentage", "is", null)
    .gt("retention_percentage", 0);

  for (const s of subs ?? []) {
    if (!s.completion_date) continue;
    const days = daysBetween(s.completion_date);
    if (days < -90) {
      alerts.push({
        severity: "amber",
        message: `${projectName(s.project_id)}: retention for ${s.company_name} hasn't been released, ${Math.abs(days)}d since completion.`,
        href: `/projects/${s.project_id}/subcontractors/${s.id}`,
        projectId: s.project_id,
        projectName: projectName(s.project_id),
      });
    }
  }

  // --- Subcontractor insurance / licence expiry --------------------------
  // A subbie working without current public liability insurance or a valid
  // trade licence is a real exposure for the builder, not just a paperwork
  // gap — flag it the same way as the company's own QBCC licence.
  const { data: activeSubs } = await supabase
    .from("subcontractors")
    .select("id, project_id, company_name, insurance_expiry, licence_expiry, status")
    .in("project_id", projectIds)
    .in("status", ["active", "awarded"]);

  for (const s of activeSubs ?? []) {
    if (s.insurance_expiry) {
      const days = daysBetween(s.insurance_expiry);
      if (days < 0) {
        alerts.push({
          severity: "red",
          message: `${projectName(s.project_id)}: ${s.company_name}'s insurance expired ${Math.abs(days)}d ago.`,
          href: `/projects/${s.project_id}/subcontractors/${s.id}`,
          projectId: s.project_id,
          projectName: projectName(s.project_id),
        });
      } else if (days <= 30) {
        alerts.push({
          severity: "amber",
          message: `${projectName(s.project_id)}: ${s.company_name}'s insurance expires in ${days}d.`,
          href: `/projects/${s.project_id}/subcontractors/${s.id}`,
          projectId: s.project_id,
          projectName: projectName(s.project_id),
        });
      }
    }
    if (s.licence_expiry) {
      const days = daysBetween(s.licence_expiry);
      if (days < 0) {
        alerts.push({
          severity: "red",
          message: `${projectName(s.project_id)}: ${s.company_name}'s licence expired ${Math.abs(days)}d ago.`,
          href: `/projects/${s.project_id}/subcontractors/${s.id}`,
          projectId: s.project_id,
          projectName: projectName(s.project_id),
        });
      } else if (days <= 30) {
        alerts.push({
          severity: "amber",
          message: `${projectName(s.project_id)}: ${s.company_name}'s licence expires in ${days}d.`,
          href: `/projects/${s.project_id}/subcontractors/${s.id}`,
          projectId: s.project_id,
          projectName: projectName(s.project_id),
        });
      }
    }
  }

  // --- Client selections overdue for a decision --------------------------
  // A selection stuck without a client choice past its due date holds up
  // ordering (and, downstream, the schedule) — flag it the same way as an
  // overdue Direction to Rectify.
  const { data: overdueSelections } = await supabase
    .from("selections")
    .select("id, project_id, category, due_date")
    .in("project_id", projectIds)
    .eq("status", "awaiting_choice")
    .not("due_date", "is", null);

  for (const s of overdueSelections ?? []) {
    if (!s.due_date) continue;
    const days = daysBetween(s.due_date);
    if (days < 0) {
      alerts.push({
        severity: "red",
        message: `${projectName(s.project_id)}: selection "${s.category}" is ${Math.abs(days)}d overdue for a client decision.`,
        href: `/projects/${s.project_id}/selections/${s.id}`,
        projectId: s.project_id,
        projectName: projectName(s.project_id),
      });
    } else if (days <= 7) {
      alerts.push({
        severity: "amber",
        message: `${projectName(s.project_id)}: selection "${s.category}" is due for a client decision in ${days}d.`,
        href: `/projects/${s.project_id}/selections/${s.id}`,
        projectId: s.project_id,
        projectName: projectName(s.project_id),
      });
    }
  }

  // --- Extension of Time notice deadlines ---------------------------------
  // Missing the contractual notice window (commonly 10 business days under
  // HIA/QBCC) can mean losing the right to claim the extension at all —
  // flag it with the same urgency as a statutory deadline.
  const { data: openEotClaims } = await supabase
    .from("eot_claims")
    .select("id, project_id, title, notice_due_date")
    .in("project_id", projectIds)
    .eq("status", "open");

  for (const c of openEotClaims ?? []) {
    const days = daysBetween(c.notice_due_date);
    if (days < 0) {
      alerts.push({
        severity: "red",
        message: `${projectName(c.project_id)}: EOT notice for "${c.title}" is ${Math.abs(days)}d overdue — the right to claim this extension may be at risk.`,
        href: `/projects/${c.project_id}/eot-claims/${c.id}`,
        projectId: c.project_id,
        projectName: projectName(c.project_id),
      });
    } else if (days <= 3) {
      alerts.push({
        severity: "amber",
        message: `${projectName(c.project_id)}: EOT notice for "${c.title}" is due in ${days}d.`,
        href: `/projects/${c.project_id}/eot-claims/${c.id}`,
        projectId: c.project_id,
        projectName: projectName(c.project_id),
      });
    }
  }

  return alerts;
}

/**
 * The full "Project health" picture — everything from getComplianceAlerts,
 * plus three more operational risks that aren't compliance per se but
 * belong in the same "things that need attention" feed: a project's
 * schedule forecast slipping past its contracted completion date, its
 * defects liability period closing within 30 days, and an active project
 * with no site diary entry logged today. Used by both the dashboard's
 * simplified notification feed and the Compliance page's full breakdown by
 * project, so the two can never drift out of sync with each other.
 */
export async function getProjectHealthAlerts(
  supabase: SupabaseServerClient,
  companyId: string | null
): Promise<ComplianceAlert[]> {
  const complianceAlerts = await getComplianceAlerts(supabase, companyId);
  if (!companyId) return complianceAlerts;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: projects }, { data: variations }, { data: entries }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, contracted_completion_date, practical_completion_date, defects_liability_end_date")
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase.from("variations").select("project_id, time_impact_days").eq("status", "approved"),
    supabase.from("diary_entries").select("project_id, entry_date"),
  ]);

  const activeProjects = projects ?? [];
  const projectIds = new Set(activeProjects.map((p) => p.id));

  const approvedDaysByProject = new Map<string, number>();
  for (const v of variations ?? []) {
    if (!projectIds.has(v.project_id)) continue;
    approvedDaysByProject.set(v.project_id, (approvedDaysByProject.get(v.project_id) ?? 0) + (v.time_impact_days ?? 0));
  }

  const lastEntryDateByProject = new Map<string, string>();
  for (const e of entries ?? []) {
    if (!projectIds.has(e.project_id)) continue;
    const existing = lastEntryDateByProject.get(e.project_id);
    if (!existing || e.entry_date > existing) lastEntryDateByProject.set(e.project_id, e.entry_date);
  }

  const operationalAlerts: ComplianceAlert[] = [];

  for (const p of activeProjects) {
    if (p.contracted_completion_date && !p.practical_completion_date) {
      const approvedDays = approvedDaysByProject.get(p.id) ?? 0;
      const forecast = addDaysToDate(p.contracted_completion_date, approvedDays);
      if (forecast < today) {
        operationalAlerts.push({
          severity: "red",
          message: `${p.name} is forecast past its contracted completion date — review schedule.`,
          href: `/projects/${p.id}/financials`,
          projectId: p.id,
          projectName: p.name,
        });
      }
    }

    if (p.defects_liability_end_date) {
      const days = daysBetween(p.defects_liability_end_date);
      if (days >= 0 && days <= 30) {
        operationalAlerts.push({
          severity: "amber",
          message: `${p.name}'s defects liability period ends within 30 days — review defects.`,
          href: `/projects/${p.id}/practical-completion`,
          projectId: p.id,
          projectName: p.name,
        });
      }
    }

    if (lastEntryDateByProject.get(p.id) !== today) {
      operationalAlerts.push({
        severity: "amber",
        message: `${p.name} hasn't had a diary entry logged today — log one now.`,
        href: `/projects/${p.id}/new-entry`,
        projectId: p.id,
        projectName: p.name,
      });
    }
  }

  return [...complianceAlerts, ...operationalAlerts].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1
  );
}
