"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const XERO_ERROR_MESSAGES: Record<string, string> = {
  not_admin: "Only a company admin can connect Xero.",
  state_mismatch: "That connection attempt expired or was tampered with — try again.",
  no_organisation: "No Xero organisation was authorised — try connecting again and pick one.",
  exchange_failed: "Couldn't finish connecting to Xero. Try again shortly.",
};

export function XeroIntegrationCard({
  connected,
  tenantName,
  connectedAt,
  configured,
  flash,
}: {
  connected: boolean;
  tenantName: string | null;
  connectedAt: string | null;
  configured: boolean;
  flash: { connected?: boolean; error?: string };
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(flash.error ? XERO_ERROR_MESSAGES[flash.error] ?? "Something went wrong connecting Xero." : null);

  async function disconnect() {
    if (!confirm("Disconnect Xero? Existing invoices already created in Xero aren't affected.")) return;
    setDisconnecting(true);
    setError(null);
    const res = await fetch("/api/integrations/xero/disconnect", { method: "POST" });
    setDisconnecting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't disconnect Xero.");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Xero</h2>
        {connected ? <Badge tone="emerald">Connected</Badge> : <Badge>Not connected</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Push a progress claim to Xero as an invoice from its detail page once connected — CivFlow checks back daily
        and marks the claim paid once Xero says it&apos;s settled. Connects to your own Xero organisation; nothing
        here costs CivFlow anything, and your existing Xero subscription is all that&apos;s needed.
      </p>

      {!configured && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
          Xero isn&apos;t configured on this server yet — an admin needs to set XERO_CLIENT_ID, XERO_CLIENT_SECRET,
          and XERO_REDIRECT_URI (see the README).
        </p>
      )}

      {flash.connected && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Connected to Xero.</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {connected ? (
        <div className="mt-3">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {tenantName ?? "Your Xero organisation"}
            {connectedAt && <span className="text-slate-500 dark:text-slate-400"> — connected {new Date(connectedAt).toLocaleDateString("en-AU")}</span>}
          </p>
          <Button variant="outline" size="sm" className="mt-2" loading={disconnecting} onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        configured && (
          <a href="/api/integrations/xero/connect" className="mt-3 inline-block">
            <Button size="sm">Connect Xero</Button>
          </a>
        )
      )}
    </Card>
  );
}
