"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClientApprovalLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  function handleShow() {
    setLink(`${window.location.origin}/vary/${token}`);
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-5 print:hidden">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Client approval link</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        No login needed for the client — they open the link, see the scope/cost/time impact, and type their name to
        approve. That&apos;s recorded with a timestamp as your evidence if the cost is ever disputed.
      </p>
      {!link ? (
        <Button variant="outline" onClick={handleShow} className="mt-3">
          Get link to send
        </Button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="field flex-1 bg-slate-50 dark:bg-slate-950" />
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
    </Card>
  );
}
