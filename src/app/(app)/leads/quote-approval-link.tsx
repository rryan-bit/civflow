"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function QuoteApprovalLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  function handleShow() {
    setLink(`${window.location.origin}/quote/${token}`);
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!link) {
    return (
      <button type="button" onClick={handleShow} className="mt-2 text-xs font-medium text-brand-orange hover:underline">
        Get client link to accept
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input readOnly value={link} onFocus={(e) => e.target.select()} className="field !w-auto flex-1 !py-1.5 bg-slate-50 text-xs dark:bg-slate-950" />
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
