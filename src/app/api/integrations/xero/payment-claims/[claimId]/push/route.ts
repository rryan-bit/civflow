import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getUsableXeroConnection, findOrCreateXeroContact, createXeroInvoice } from "@/lib/xero";

// Pushes one payment claim to Xero as an ACCREC invoice. Deliberately a
// manual, explicit action (a button the user clicks) rather than automatic
// on submit — creating an invoice in someone's real accounting system isn't
// something to do silently behind their back, even though it's their own
// data going to their own connected Xero org.

export async function POST(request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.xeroPush);
  if (!allowed) return rateLimitResponse();

  const { data: claim } = await supabase
    .from("payment_claims")
    .select("id, project_id, claim_number, claim_date, due_date, amount_claimed, xero_invoice_id")
    .eq("id", claimId)
    .single();
  if (!claim) return NextResponse.json({ error: "Payment claim not found." }, { status: 404 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, company_id, client_name, client_email, xero_contact_id")
    .eq("id", claim.project_id)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  if (!project.client_name) {
    return NextResponse.json(
      { error: "Add a client name on this project first (Edit project) — Xero needs a contact to invoice." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const connection = await getUsableXeroConnection(admin, project.company_id);
  if (!connection) {
    return NextResponse.json({ error: "Xero isn't connected yet — connect it from the Compliance page first." }, { status: 400 });
  }

  try {
    let contactId = project.xero_contact_id;
    if (!contactId) {
      contactId = await findOrCreateXeroContact(connection.accessToken, connection.tenantId, {
        name: project.client_name,
        email: project.client_email,
      });
      await supabase.from("projects").update({ xero_contact_id: contactId }).eq("id", project.id);
    }

    const claimLabel = claim.claim_number ? `Claim ${claim.claim_number}` : "Progress claim";
    const invoice = await createXeroInvoice(connection.accessToken, connection.tenantId, {
      contactId,
      description: `${claimLabel} — ${project.name}`,
      amount: claim.amount_claimed,
      date: claim.claim_date,
      dueDate: claim.due_date,
      reference: `${project.name} — ${claimLabel}`,
    });

    await supabase
      .from("payment_claims")
      .update({ xero_invoice_id: invoice.invoiceId, xero_invoice_status: invoice.status, xero_synced_at: new Date().toISOString() })
      .eq("id", claim.id);

    return NextResponse.json({ ok: true, invoiceId: invoice.invoiceId, status: invoice.status });
  } catch (err) {
    console.error("Xero invoice push failed:", err);
    return NextResponse.json({ error: "Couldn't create the Xero invoice. Try again shortly." }, { status: 500 });
  }
}
