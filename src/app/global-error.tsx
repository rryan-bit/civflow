"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

// Only fires if the root layout itself throws — has to render its own
// <html>/<body> since it replaces everything, including layout.tsx.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">CivFlow hit a snag</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          This has been reported automatically. Reloading usually fixes it.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
