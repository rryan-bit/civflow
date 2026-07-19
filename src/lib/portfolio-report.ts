import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getComplianceAlerts } from "@/lib/compliance";
import { addDaysToDate, daysBetweenDates } from "@/lib/dates";
import { calculatePercentBilled } from "@/lib/financial-calcs";

type SupabaseServerClient = SupabaseClient<Database>;

export type PortfolioRow = {
  id: string;
  name: string;
  status: string;
  originalContractValue: number | null;
  revisedContractValue: number;
  totalClaimed: number;
  percentBilled: number | null;
  scheduleVarianceDays: number | null;
  complianceAlertCount: number;
};

/**
 * Shared across the /reports portfolio page and its CSV export so the two
 * never drift — same numbers whether you're looking at the table on screen
 * or the file you download from it.
 */
export async function getPortfolioRows(supabase: SupabaseServerClient, companyId: string): Promise<PortfolioRow[]> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, contract_value, contracted_completion_date, practical_completion_date")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const allProjects = projects ?? [];
  if (!allProjects.length) return [];
  const projectIds = allProjects.map((p) => p.id);

  const [{ data: variations }, { data: paymentClaims }, complianceAlerts] = await Promise.all([
    supabase.from("variations").select("project_id, cost_impact, time_impact_days").in("project_id", projectIds).eq("status", "approved"),
    supabase.from("payment_claims").select("project_id, amount_claimed").in("project_id", projectIds),
    getComplianceAlerts(supabase, companyId),
  ]);

  const approvedByProject = new Map<string, { cost: number; days: number }>();
  for (const v of variations ?? []) {
    const existing = approvedByProject.get(v.project_id) ?? { cost: 0, days: 0 };
    existing.cost += v.cost_impact ?? 0;
    existing.days += v.time_impact_days ?? 0;
    approvedByProject.set(v.project_id, existing);
  }

  const claimedByProject = new Map<string, number>();
  for (const c of paymentClaims ?? []) {
    claimedByProject.set(c.project_id, (claimedByProject.get(c.project_id) ?? 0) + c.amount_claimed);
  }

  const alertCountByProject = new Map<string, number>();
  for (const a of complianceAlerts) {
    const match = a.href.match(/^\/projects\/([^/]+)\//);
    if (!match) continue;
    alertCountByProject.set(match[1], (alertCountByProject.get(match[1]) ?? 0) + 1);
  }

  return allProjects.map((p) => {
    const approved = approvedByProject.get(p.id) ?? { cost: 0, days: 0 };
    const originalContractValue = p.contract_value;
    const revisedContractValue = (p.contract_value ?? 0) + approved.cost;
    const totalClaimed = claimedByProject.get(p.id) ?? 0;
    const percentBilled = calculatePercentBilled(totalClaimed, revisedContractValue);

    const forecastCompletion =
      p.practical_completion_date ?? (p.contracted_completion_date ? addDaysToDate(p.contracted_completion_date, approved.days) : null);
    const scheduleVarianceDays =
      p.contracted_completion_date && forecastCompletion ? daysBetweenDates(p.contracted_completion_date, forecastCompletion) : null;

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      originalContractValue,
      revisedContractValue,
      totalClaimed,
      percentBilled,
      scheduleVarianceDays,
      complianceAlertCount: alertCountByProject.get(p.id) ?? 0,
    };
  });
}
