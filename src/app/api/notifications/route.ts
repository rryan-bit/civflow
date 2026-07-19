import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getComplianceAlerts } from "@/lib/compliance";
import { daysBetween, toDateInput } from "@/lib/dates";

// Powers the notification bell in the app header — the in-app counterpart
// to the daily digest email, but computed live on request rather than sent
// once a day. Same three categories as the digest: compliance alerts, due/
// overdue reminders, and active projects with no diary entry logged today.
// Nothing is persisted here (no read/unread state) — it's always "what's
// outstanding right now", which keeps this simple and always accurate.

export type NotificationItem = {
  severity: "red" | "amber";
  message: string;
  href: string;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ items: [] satisfies NotificationItem[] });
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const companyId = profile?.company_id ?? null;
  if (!companyId) {
    return NextResponse.json({ items: [] satisfies NotificationItem[] });
  }

  const items: NotificationItem[] = [];

  const complianceAlerts = await getComplianceAlerts(supabase, companyId);
  for (const a of complianceAlerts) {
    items.push({ severity: a.severity, message: a.message, href: a.href });
  }

  const today = toDateInput(new Date());
  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, title, due_date, project_id")
    .eq("company_id", companyId)
    .eq("completed", false)
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(20);

  for (const r of reminders ?? []) {
    const days = daysBetween(r.due_date);
    items.push({
      severity: days < 0 ? "red" : "amber",
      message: days < 0 ? `Reminder overdue: "${r.title}" (${Math.abs(days)}d ago).` : `Reminder due today: "${r.title}".`,
      href: "/calendar",
    });
  }

  const { data: activeProjects } = await supabase.from("projects").select("id, name").eq("company_id", companyId).eq("status", "active");
  const projectIds = (activeProjects ?? []).map((p) => p.id);
  const { data: todaysEntries } = projectIds.length
    ? await supabase.from("diary_entries").select("project_id").in("project_id", projectIds).eq("entry_date", today)
    : { data: [] as { project_id: string }[] };
  const loggedTodayIds = new Set((todaysEntries ?? []).map((e) => e.project_id));

  for (const p of activeProjects ?? []) {
    if (!loggedTodayIds.has(p.id)) {
      items.push({ severity: "amber", message: `${p.name}: no site diary entry logged today.`, href: `/projects/${p.id}/new-entry` });
    }
  }

  return NextResponse.json({ items });
}
