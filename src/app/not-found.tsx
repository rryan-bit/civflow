import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button-styles";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <LogoMark className="h-10 w-10 rounded-[10px]" />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">404</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        That page doesn&apos;t exist, or you may not have access to it — check the link, or head back to the
        dashboard.
      </p>
      <div className="mt-6">
        <Link href="/dashboard" className={buttonStyles("primary", "md")}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
