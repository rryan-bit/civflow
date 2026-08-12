"use client";

import { Children, useState, type ReactNode } from "react";

const ChevronDownIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Wraps a grid of items (module tiles, stat cards) and only renders the
 * first `visibleCount` by default, with a pill-shaped toggle row to reveal
 * the rest — the same clutter-reduction pattern used on both the
 * dashboard's stats and the project hub's module grids, so a page doesn't
 * dump a dozen-plus equally-weighted items on someone at once. Nothing is
 * removed, it's just not all shouting for attention on first look.
 */
export function ExpandableGrid({
  children,
  visibleCount,
  gridClassName,
  collapsedLabel,
  indicatorColor,
}: {
  children: ReactNode;
  visibleCount: number;
  gridClassName: string;
  /** Shown on the toggle when it starts fully collapsed (visibleCount 0),
   * e.g. "Compliance & quality" — reads as "Compliance & quality (8)".
   * Left unset, the toggle just reads "Show N more". */
  collapsedLabel?: string;
  /** Optional small dot before the label — e.g. a severity colour for a
   * per-project notification group, so it can be scanned without opening. */
  indicatorColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, visibleCount);
  const hiddenCount = items.length - visible.length;

  const toggleLabel = expanded
    ? collapsedLabel
      ? `Hide ${collapsedLabel.toLowerCase()}`
      : "Show less"
    : collapsedLabel && visibleCount === 0
      ? `${collapsedLabel} (${items.length})`
      : `Show ${hiddenCount} more`;

  return (
    <div>
      {visible.length > 0 && <div className={gridClassName}>{visible}</div>}
      {items.length > visibleCount && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-surface-hover dark:text-slate-300 ${
            visible.length > 0 ? "mt-3" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            {indicatorColor && <span className={`h-2 w-2 shrink-0 rounded-full ${indicatorColor}`} aria-hidden="true" />}
            {toggleLabel}
          </span>
          <ChevronDownIcon expanded={expanded} />
        </button>
      )}
    </div>
  );
}
