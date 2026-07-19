"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function XeroPushButton({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function push() {
    setPushing(true);
    setError(null);
    const res = await fetch(`/api/integrations/xero/payment-claims/${claimId}/push`, { method: "POST" });
    setPushing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't push this claim to Xero.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="outline" size="sm" loading={pushing} onClick={push}>
        Push to Xero
      </Button>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
