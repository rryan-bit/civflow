import { createClient } from "@/lib/supabase/server";
import { AddReminderForm } from "@/components/reminders/add-reminder-form";
import { MonthCalendar } from "./month-calendar";
import type { CalendarItem } from "@/lib/calendar-types";

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, defects_liability_end_date")
    .order("name", { ascending: true });

  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "Unknown project";

  const [
    { data: reminders },
    { data: rfis },
    { data: dtrs },
    { data: paymentClaims },
    { data: swmsRecords },
    { data: milestones },
    { data: inspections },
    { data: defects },
    { data: teamLicences },
    { data: leads },
  ] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, title, due_date, notes, project_id")
      .eq("completed", false)
      .order("due_date", { ascending: true }),
    supabase.from("rfis").select("id, project_id, subject, due_date").eq("status", "open").not("due_date", "is", null),
    supabase
      .from("directions_to_rectify")
      .select("id, project_id, description, due_date")
      .in("status", ["open", "disputed"]),
    supabase
      .from("payment_claims")
      .select("id, project_id, claim_number, due_date, schedule_due_date, status")
      .in("status", ["submitted", "schedule_received"]),
    supabase
      .from("swms")
      .select("id, project_id, title, review_due_date")
      .in("status", ["current", "review_due"])
      .not("review_due_date", "is", null),
    supabase
      .from("milestones")
      .select("id, project_id, name, target_date")
      .neq("status", "complete")
      .not("target_date", "is", null),
    supabase
      .from("inspections")
      .select("id, project_id, work_area, scheduled_date")
      .eq("status", "pending")
      .not("scheduled_date", "is", null),
    supabase.from("defects").select("id, project_id, description, due_date").eq("status", "open").not("due_date", "is", null),
    supabase.from("profiles").select("id, full_name, qbcc_licence_expiry").not("qbcc_licence_expiry", "is", null),
    supabase
      .from("leads")
      .select("id, client_name, follow_up_date")
      .not("status", "in", "(won,lost)")
      .not("follow_up_date", "is", null),
  ]);

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("qbcc_licence_expiry, mfr_report_due_date")
        .eq("id", profile.company_id)
        .single()
    : { data: null };

  const items: CalendarItem[] = [];

  for (const r of reminders ?? []) {
    items.push({
      id: `reminder-${r.id}`,
      type: "Reminder",
      label: r.title,
      date: r.due_date,
      href: "#",
      projectName: r.project_id ? projectName(r.project_id) : undefined,
    });
  }
  for (const r of rfis ?? []) {
    if (!r.due_date) continue;
    items.push({ id: `rfi-${r.id}`, type: "RFI", label: r.subject, date: r.due_date, href: `/projects/${r.project_id}/rfis/${r.id}`, projectName: projectName(r.project_id) });
  }
  for (const d of dtrs ?? []) {
    items.push({ id: `dtr-${d.id}`, type: "DTR", label: d.description, date: d.due_date, href: `/projects/${d.project_id}/directions-to-rectify/${d.id}`, projectName: projectName(d.project_id) });
  }
  for (const c of paymentClaims ?? []) {
    items.push({
      id: `claim-due-${c.id}`,
      type: "Payment due",
      label: c.claim_number ? `Claim ${c.claim_number}` : "Payment claim",
      date: c.due_date,
      href: `/projects/${c.project_id}/payment-claims/${c.id}`,
      projectName: projectName(c.project_id),
    });
    if (c.status === "submitted" && c.schedule_due_date) {
      items.push({
        id: `claim-schedule-${c.id}`,
        type: "Payment schedule",
        label: c.claim_number ? `Schedule for claim ${c.claim_number}` : "Payment schedule",
        date: c.schedule_due_date,
        href: `/projects/${c.project_id}/payment-claims/${c.id}`,
        projectName: projectName(c.project_id),
      });
    }
  }
  for (const s of swmsRecords ?? []) {
    if (!s.review_due_date) continue;
    items.push({ id: `swms-${s.id}`, type: "SWMS review", label: s.title, date: s.review_due_date, href: `/projects/${s.project_id}/swms/${s.id}`, projectName: projectName(s.project_id) });
  }
  for (const m of milestones ?? []) {
    if (!m.target_date) continue;
    items.push({ id: `milestone-${m.id}`, type: "Milestone", label: m.name, date: m.target_date, href: `/projects/${m.project_id}/milestones`, projectName: projectName(m.project_id) });
  }
  for (const i of inspections ?? []) {
    if (!i.scheduled_date) continue;
    items.push({ id: `inspection-${i.id}`, type: "Inspection", label: i.work_area, date: i.scheduled_date, href: `/projects/${i.project_id}/inspections/${i.id}`, projectName: projectName(i.project_id) });
  }
  for (const d of defects ?? []) {
    if (!d.due_date) continue;
    items.push({ id: `defect-${d.id}`, type: "Defect", label: d.description, date: d.due_date, href: `/projects/${d.project_id}/practical-completion`, projectName: projectName(d.project_id) });
  }
  for (const p of projects ?? []) {
    if (p.defects_liability_end_date) {
      items.push({ id: `dlp-${p.id}`, type: "DLP ends", label: `${p.name} — defects liability ends`, date: p.defects_liability_end_date, href: `/projects/${p.id}/practical-completion`, projectName: p.name });
    }
  }
  if (company?.qbcc_licence_expiry) {
    items.push({ id: "company-licence", type: "Licence expiry", label: "Company QBCC licence", date: company.qbcc_licence_expiry, href: "/compliance" });
  }
  if (company?.mfr_report_due_date) {
    items.push({ id: "company-mfr", type: "MFR report", label: "Company MFR report", date: company.mfr_report_due_date, href: "/compliance" });
  }
  for (const p of teamLicences ?? []) {
    if (!p.qbcc_licence_expiry) continue;
    items.push({ id: `profile-licence-${p.id}`, type: "Licence expiry", label: `${p.full_name ?? "Team member"}'s QBCC licence`, date: p.qbcc_licence_expiry, href: "/compliance" });
  }
  for (const l of leads ?? []) {
    if (!l.follow_up_date) continue;
    items.push({ id: `lead-${l.id}`, type: "Lead follow-up", label: l.client_name, date: l.follow_up_date, href: "/leads" });
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Calendar</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Every due date CivFlow is tracking — RFIs, Directions to Rectify, payment claims, SWMS reviews, milestones,
        inspections, defects, licence/MFR expiries, lead follow-ups — plus your own reminders. Click a date to see
        what&apos;s due.
      </p>

      <div className="mt-6">
        <AddReminderForm projects={projects ?? []} />
      </div>

      <div className="mt-6">
        <MonthCalendar items={items} reminders={reminders ?? []} />
      </div>
    </div>
  );
}
