/** Simple line-art illustration for the dashboard's "no projects yet" state
 * — a house frame + crane sketch, drawn as plain inline SVG strokes so it
 * costs nothing to load and matches the flat, uncluttered surface language
 * used everywhere else (no photos, no external assets). Orange accent picks
 * out the one "active" element (the crane hook) to keep it from reading as
 * pure line noise. */
export function EmptyProjectsIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 110"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* ground line */}
      <path d="M8 96h144" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="2" strokeLinecap="round" />

      {/* house frame */}
      <path
        d="M34 96V56L58 38l24 18v40"
        className="stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M46 96V70h24v26" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M34 56h48" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" />

      {/* crane */}
      <path
        d="M108 96V26"
        className="stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M108 30h34M108 30l-10 10"
        className="stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M134 30v10" className="stroke-brand-orange" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="134" cy="44" r="3" className="fill-brand-orange" />
      <path d="M100 96h16v-8a8 8 0 0 0-16 0v8Z" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
