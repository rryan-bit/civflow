"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Wraps a grid of items (module tiles, stat cards) and only renders the
 * first `visibleCount` by default, with a toggle to reveal the rest — the
 * same clutter-reduction pattern used on both the dashboard's stats and the
 * project hub's module grids, so a page doesn't dump 12-20 equally-weighted
 * items on someone at once. Nothing is removed, it's just not all shouting
 * for attention on first look.
 */
export function ExpandableGrid({
  children,
  visibleCount,
  gridClassName,
  variant = "inline",
  collapsedLabel,
}: {
  children: ReactNode;
  visibleCount: number;
  gridClassName: string;
  /** "inline" = small text toggle under the grid. "row" = a full-width
   * clickable bar that replaces the grid entirely until opened — used
   * where a whole section should start fully tucked away. */
  variant?: "inline" | "row";
  /** Label shown on the "row" variant's toggle, e.g. "Compliance & quality". */
  collapsedLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const visible = expanded ? items : items.slice(0, visibleCount);

  if (variant === "row") {
    if (items.length === 0) return null;
    return (
      <div>
        {expanded && <div className={gridClassName}>{visible}</div>}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-surface-hover dark:text-slate-300 ${expanded ? "mt-3" : ""}`}
        >
          <span>
            {collapsedLabel} <span className="text-slate-400 dark:text-slate-500">({items.length})</span>
          </span>
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
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={gridClassName}>{visible}</div>
      {items.length > visibleCount && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 text-xs font-medium text-brand-orange hover:underline"
        >
          {expanded ? "Show less" : `Show ${items.length - visibleCount} more`}
        </button>
      )}
    </div>
  );
}
