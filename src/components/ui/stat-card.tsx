import { ReactNode } from "react";
import { AnimatedCounter } from "./animated-counter";

/** A single stat entry — no card/border/shadow of its own. Meant to sit
 * inside one shared flat panel with several of these side by side, so a
 * dozen numbers read as one clean stats overview instead of a dozen
 * separate boxes. Separation comes from whitespace, not a border. */
export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  suffix,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger";
  suffix?: string;
}) {
  const valueColor =
    tone === "danger" && value > 0
      ? "text-red-600 dark:text-red-400"
      : tone === "warning" && value > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-900 dark:text-slate-100";

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${valueColor}`}>
        <AnimatedCounter value={value} />
        {suffix}
      </p>
    </div>
  );
}
