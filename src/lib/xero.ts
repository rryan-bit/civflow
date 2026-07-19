import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Thin wrapper around Xero's OAuth2 + Accounting API — plain fetch, no SDK
// dependency, since the surface we need (token exchange/refresh, one
// contact lookup, one invoice create, one invoice status read) is small.
// Docs: https://developer.xero.com/documentation/

const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const ACCOUNTING_BASE = "https://api.xero.com/api.xro/2.0";

// offline_access is what makes Xero hand back a refresh token at all —
// without it the access token just expires in 30 minutes with no way to
// renew it short of sending the user through the consent screen again.
const SCOPES = "openid profile email accounting.transactions accounting.contacts offline_access";

function getEnv() {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI must all be set.");
  }
  return { clientId, clientSecret, redirectUri };
}

export function isXeroConfigured() {
  return Boolean(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET && process.env.XERO_REDIRECT_URI);
}

export function getXeroAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getEnv();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

async function basicAuthHeader() {
  const { clientId, clientSecret } = getEnv();
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeXeroCode(code: string): Promise<TokenResponse> {
  const { redirectUri } = getEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: await basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Xero token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function refreshXeroToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: await basicAuthHeader(),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Xero token refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getXeroConnections(accessToken: string): Promise<{ tenantId: string; tenantName: string; tenantType: string }[]> {
  const res = await fetch(CONNECTIONS_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Couldn't list Xero connections: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data as { tenantId: string; tenantName: string; tenantType: string }[]).map((c) => ({
    tenantId: c.tenantId,
    tenantName: c.tenantName,
    tenantType: c.tenantType,
  }));
}

/**
 * Loads the company's stored connection, refreshes the access token if it's
 * within 2 minutes of expiring (Xero access tokens only live 30 minutes),
 * persists the rotated tokens, and returns what's needed to call the
 * Accounting API. Returns null if the company has no connection at all.
 * `admin` must be the service-role client — xero_connections has no RLS
 * policy for any other role.
 */
export async function getUsableXeroConnection(admin: SupabaseClient<Database>, companyId: string) {
  const { data: connection } = await admin.from("xero_connections").select("*").eq("company_id", companyId).maybeSingle();
  if (!connection) return null;

  const expiresInMs = new Date(connection.expires_at).getTime() - Date.now();
  if (expiresInMs > 2 * 60 * 1000) {
    return { accessToken: connection.access_token, tenantId: connection.tenant_id };
  }

  const refreshed = await refreshXeroToken(connection.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin
    .from("xero_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  return { accessToken: refreshed.access_token, tenantId: connection.tenant_id };
}

async function xeroApiFetch(accessToken: string, tenantId: string, path: string, init?: RequestInit) {
  const res = await fetch(`${ACCOUNTING_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Xero API error on ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Escapes a value for use inside a Xero `where` query-string clause. */
function xeroWhereString(value: string) {
  return value.replace(/"/g, '\\"');
}

/**
 * Finds a Xero contact by exact name match, creating one if none exists.
 * Callers should cache the returned ContactID (projects.xero_contact_id) so
 * repeat invoices for the same client reuse one contact instead of piling
 * up duplicates.
 */
export async function findOrCreateXeroContact(
  accessToken: string,
  tenantId: string,
  contact: { name: string; email: string | null }
): Promise<string> {
  const found = await xeroApiFetch(accessToken, tenantId, `/Contacts?where=Name=="${xeroWhereString(contact.name)}"`);
  const existing = found?.Contacts?.[0]?.ContactID;
  if (existing) return existing;

  const created = await xeroApiFetch(accessToken, tenantId, "/Contacts", {
    method: "POST",
    body: JSON.stringify({ Contacts: [{ Name: contact.name, EmailAddress: contact.email ?? undefined }] }),
  });
  const contactId = created?.Contacts?.[0]?.ContactID;
  if (!contactId) throw new Error("Xero didn't return a ContactID for the new contact.");
  return contactId;
}

export async function createXeroInvoice(
  accessToken: string,
  tenantId: string,
  invoice: { contactId: string; description: string; amount: number; date: string; dueDate: string; reference: string }
): Promise<{ invoiceId: string; status: string }> {
  const created = await xeroApiFetch(accessToken, tenantId, "/Invoices", {
    method: "POST",
    body: JSON.stringify({
      Invoices: [
        {
          Type: "ACCREC",
          Contact: { ContactID: invoice.contactId },
          Date: invoice.date,
          DueDate: invoice.dueDate,
          Reference: invoice.reference,
          Status: "AUTHORISED",
          LineItems: [
            {
              Description: invoice.description,
              Quantity: 1,
              UnitAmount: invoice.amount,
              AccountCode: "200",
            },
          ],
        },
      ],
    }),
  });
  const result = created?.Invoices?.[0];
  if (!result?.InvoiceID) throw new Error("Xero didn't return an InvoiceID for the new invoice.");
  return { invoiceId: result.InvoiceID, status: result.Status };
}

export async function getXeroInvoiceStatus(
  accessToken: string,
  tenantId: string,
  invoiceId: string
): Promise<{ status: string; amountPaid: number; total: number } | null> {
  const data = await xeroApiFetch(accessToken, tenantId, `/Invoices/${invoiceId}`);
  const invoice = data?.Invoices?.[0];
  if (!invoice) return null;
  return { status: invoice.Status, amountPaid: invoice.AmountPaid ?? 0, total: invoice.Total ?? 0 };
}
