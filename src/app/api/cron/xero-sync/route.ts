import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsableXeroConnection, getXeroInvoiceStatus, isXeroConfigured } from "@/lib/xero";
import { toDateInput } from "@/lib/dates";

// Xero is the source of truth for whether an invoice has actually been
// paid — CivFlow doesn't move money, so this just asks once a day and
// mirrors the answer back onto the payment claim. Meant to be hit by
// Vercel Cron (see vercel.json), same CRON_SECRET auth as the daily digest.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isXeroConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Xero isn't configured on this server." });
  }

  const admin = createAdminClient();

  const { data: claims, error: claimsError } = await admin
    .from("payment_claims")
    .select("id, project_id, xero_invoice_id, status")
    .not("xero_invoice_id", "is", null)
    .neq("status", "paid");
  if (claimsError) {
    return NextResponse.json({ error: claimsError.message }, { status: 500 });
  }
  if (!claims?.length) {
    return NextResponse.json({ checked: 0, updated: 0 });
  }

  const projectIds = [...new Set(claims.map((c) => c.project_id))];
  const { data: projects } = await admin.from("projects").select("id, company_id").in("id", projectIds);
  const companyIdByProject = new Map((projects ?? []).map((p) => [p.id, p.company_id]));

  const claimsByCompany = new Map<string, typeof claims>();
  for (const claim of claims) {
    const companyId = companyIdByProject.get(claim.project_id);
    if (!companyId) continue;
    if (!claimsByCompany.has(companyId)) claimsByCompany.set(companyId, []);
    claimsByCompany.get(companyId)!.push(claim);
  }

  let checked = 0;
  let updated = 0;
  const today = toDateInput(new Date());

  for (const [companyId, companyClaims] of claimsByCompany) {
    const connection = await getUsableXeroConnection(admin, companyId);
    if (!connection) continue;

    for (const claim of companyClaims) {
      checked++;
      try {
        const status = await getXeroInvoiceStatus(connection.accessToken, connection.tenantId, claim.xero_invoice_id!);
        if (!status) continue;

        if (status.status === "PAID") {
          await admin
            .from("payment_claims")
            .update({
              status: "paid",
              paid_amount: status.amountPaid,
              paid_date: today,
              xero_invoice_status: status.status,
              xero_synced_at: new Date().toISOString(),
            })
            .eq("id", claim.id);
          updated++;
        } else {
          await admin
            .from("payment_claims")
            .update({ xero_invoice_status: status.status, xero_synced_at: new Date().toISOString() })
            .eq("id", claim.id);
        }
      } catch (err) {
        console.error(`Xero sync failed for claim ${claim.id}:`, err);
      }
    }
  }

  return NextResponse.json({ checked, updated });
}
