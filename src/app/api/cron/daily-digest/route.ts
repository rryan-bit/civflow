import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getComplianceAlerts } from "@/lib/compliance";
import { toDateInput } from "@/lib/dates";

// Daily digest: everything in CivFlow today is pull-based (a compliance
// risk or an overdue reminder only surfaces if someone opens the app). This
// route is meant to be hit once a day by Vercel Cron (see vercel.json) and
// pushes each company's admins/team an email if — and only if — there's
// actually something to act on: a compliance alert, an overdue/due-today
// reminder, or an active project with no site diary entry logged today.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
// when CRON_SECRET is set as an env var, so that's what gates this route
// instead of a normal user session (there isn't one — this runs headless).

export const dynamic = "force-dynamic";

type DigestSection = { heading: string; items: string[] };

function buildEmailHtml(companyName: string, sections: DigestSection[], appUrl: string): string {
  const sectionsHtml = sections
    .map(
      (s) => `
      <h2 style="font-size:15px;margin:20px 0 8px;color:#0f172a;">${s.heading}</h2>
      <ul style="margin:0 0 4px;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">
        ${s.items.map((i) => `<li>${i}</li>`).join("")}
      </ul>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:18px;color:#0f172a;">Your CivFlow daily digest</h1>
      <p style="font-size:14px;color:#475569;">Here's what needs attention across ${companyName}'s active projects today.</p>
      ${sectionsHtml}
      <p style="margin-top:24px;font-size:13px;">
        <a href="${appUrl}/dashboard" style="color:#c2410c;">Open CivFlow →</a>
      </p>
      <p style="margin-top:16px;font-size:11px;color:#94a3b8;">
        This is an automated tracking aid, not a substitute for checking directly with the QBCC or your own records.
      </p>
    </div>`;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not configured — daily digest emails are disabled." });
  }

  const appUrl = new URL(request.url).origin;
  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.DIGEST_FROM_EMAIL || "CivFlow <onboarding@resend.dev>";
  const today = toDateInput(new Date());

  const { data: companies, error: companiesError } = await admin.from("companies").select("id, name");
  if (companiesError || !companies) {
    return NextResponse.json({ error: companiesError?.message ?? "Couldn't load companies." }, { status: 500 });
  }

  const results: { company: string; sent: boolean; reason?: string }[] = [];

  for (const company of companies) {
    // Idempotency: if a cron run already sent today's digest for this
    // company (e.g. the schedule fired twice, or this route was hit
    // manually for testing), don't send a second copy.
    const { data: alreadySent } = await admin
      .from("notification_log")
      .select("id")
      .eq("company_id", company.id)
      .eq("kind", "daily_digest")
      .eq("sent_date", today)
      .maybeSingle();
    if (alreadySent) {
      results.push({ company: company.name, sent: false, reason: "already sent today" });
      continue;
    }

    const [complianceAlerts, { data: dueReminders }, { data: activeProjects }] = await Promise.all([
      getComplianceAlerts(admin, company.id),
      admin
        .from("reminders")
        .select("id, title, due_date, project_id")
        .eq("company_id", company.id)
        .eq("completed", false)
        .lte("due_date", today)
        .order("due_date", { ascending: true }),
      admin.from("projects").select("id, name").eq("company_id", company.id).eq("status", "active"),
    ]);

    const projectIds = (activeProjects ?? []).map((p) => p.id);
    const { data: todaysEntries } = projectIds.length
      ? await admin.from("diary_entries").select("project_id").in("project_id", projectIds).eq("entry_date", today)
      : { data: [] as { project_id: string }[] };
    const loggedTodayIds = new Set((todaysEntries ?? []).map((e) => e.project_id));
    const missingEntryProjects = (activeProjects ?? []).filter((p) => !loggedTodayIds.has(p.id));

    const sections: DigestSection[] = [];
    if (complianceAlerts.length) {
      sections.push({
        heading: "Compliance",
        items: complianceAlerts.map((a) => `[${a.severity === "red" ? "action needed" : "watch"}] ${a.message}`),
      });
    }
    if (dueReminders?.length) {
      sections.push({
        heading: "Due or overdue reminders",
        items: dueReminders.map((r) => `${r.title} — due ${r.due_date}`),
      });
    }
    if (missingEntryProjects.length) {
      sections.push({
        heading: "No site diary entry logged today",
        items: missingEntryProjects.map((p) => p.name),
      });
    }

    if (!sections.length) {
      results.push({ company: company.name, sent: false, reason: "nothing to report" });
      continue;
    }

    const { data: recipients } = await admin
      .from("profiles")
      .select("email")
      .eq("company_id", company.id)
      .not("email", "is", null);
    const emails = [...new Set((recipients ?? []).map((r) => r.email).filter((e): e is string => !!e))];

    if (!emails.length) {
      results.push({ company: company.name, sent: false, reason: "no recipient emails on file" });
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: emails,
      subject: `CivFlow daily digest — ${sections.reduce((n, s) => n + s.items.length, 0)} item(s) need attention`,
      html: buildEmailHtml(company.name, sections, appUrl),
    });

    if (sendError) {
      results.push({ company: company.name, sent: false, reason: sendError.message });
      continue;
    }

    // Record the send so a re-run today is a no-op. Ignore a conflict here
    // (unique company_id/kind/sent_date) — it just means we lost a race
    // with another invocation, which is fine, the email already went out.
    await admin.from("notification_log").insert({ company_id: company.id, kind: "daily_digest", sent_date: today });

    results.push({ company: company.name, sent: true });
  }

  return NextResponse.json({ processed: results.length, results });
}
