import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortfolioRows } from "@/lib/portfolio-report";

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  const rows = await getPortfolioRows(supabase, profile.company_id);

  const header = ["Project", "Status", "Original contract value", "Revised contract value", "Claimed to date", "Percent billed", "Schedule variance (days)", "Compliance alerts"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.status),
        csvEscape(r.originalContractValue ?? ""),
        csvEscape(r.revisedContractValue),
        csvEscape(r.totalClaimed),
        csvEscape(r.percentBilled ?? ""),
        csvEscape(r.scheduleVarianceDays ?? ""),
        csvEscape(r.complianceAlertCount),
      ].join(","),
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="civflow-portfolio-${today}.csv"`,
    },
  });
}
