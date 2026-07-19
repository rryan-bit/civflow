// Shared class strings for anything that looks like a button — actual
// <button>s, and <Link>s styled as buttons (there are many of the latter in
// this app, so a component with an `asChild`/Slot API would add complexity
// for little benefit; a plain class-string builder works for both).

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

const variants: Record<ButtonVariant, string> = {
  // Orange is the one consistent "do the thing" color app-wide now (used to
  // be navy in light mode and orange in dark mode — two different signals
  // for the same action). Navy is reserved for headings/text, not buttons.
  primary: "bg-brand-orange text-white hover:bg-orange-600",
  secondary:
    "bg-surface text-slate-900 hover:bg-surface-hover dark:text-slate-100",
  outline:
    "border border-slate-200 bg-transparent text-slate-700 hover:bg-surface hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-surface-hover",
  ghost: "text-slate-600 hover:bg-surface hover:text-slate-900 dark:text-slate-400 dark:hover:bg-surface-hover dark:hover:text-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2 text-sm",
  lg: "rounded-xl px-5 py-2.5 text-sm",
};

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
}
