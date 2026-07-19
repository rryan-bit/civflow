/**
 * CivFlow mark: an abstract flowing "C" built from two offset arcs, with a
 * small connection node where they nearly meet — reads as flow / connected
 * infrastructure / a subtle nod to AI (the node). Uses currentColor for the
 * arcs so it inherits theme color, with the brand orange reserved for the
 * accent node so it stays legible as a small app icon or on a hard hat decal.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" className="fill-[#0F172A] dark:fill-[#F97316]" />
      <path
        d="M27.5 13C25.6 10.9 22.9 9.6 20 9.6c-5.7 0-10.4 4.7-10.4 10.4S14.3 30.4 20 30.4c2.9 0 5.6-1.2 7.5-3.3"
        stroke="white"
        strokeWidth="3.1"
        strokeLinecap="round"
        fill="none"
        className="dark:stroke-[#0F172A]"
      />
      <circle cx="28.4" cy="13" r="2.6" className="fill-[#F97316] dark:fill-white" />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className={`text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${textClassName ?? ""}`}>
        CivFlow
      </span>
    </span>
  );
}
