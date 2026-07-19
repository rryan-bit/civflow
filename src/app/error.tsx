"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function GlobalErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <LogoMark className="h-10 w-10 rounded-[10px]" />
      <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        This has been reported automatically. Your data is safe — try again, or head back to the dashboard.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
