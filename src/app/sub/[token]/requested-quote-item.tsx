"use client";

import { useState } from "react";
import { QuoteForm } from "./quote-form";

export function RequestedQuoteItem({ token, quoteId, description }: { token: string; quoteId: string; description: string }) {
  const [responding, setResponding] = useState(false);

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-900 dark:text-slate-100">{description}</p>
        {!responding && (
          <button type="button" onClick={() => setResponding(true)} className="shrink-0 text-xs font-medium text-brand-orange hover:underline">
            Submit your quote
          </button>
        )}
      </div>
      {responding && (
        <QuoteForm token={token} existingQuoteId={quoteId} existingDescription={description} onDone={() => setResponding(false)} />
      )}
    </li>
  );
}
