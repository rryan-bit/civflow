"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationItem } from "@/app/api/notifications/route";

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const count = items?.length ?? 0;
  const hasRed = items?.some((i) => i.severity === "red") ?? false;

  // Red (urgent) first, then amber — so the most important items are what
  // a builder sees without scrolling, regardless of which category
  // happened to be pushed into the list last.
  const sortedItems = items ? [...items].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1)) : null;
  const VISIBLE_LIMIT = 8;
  const visibleItems = sortedItems?.slice(0, VISIBLE_LIMIT) ?? [];
  const hiddenCount = Math.max(0, (sortedItems?.length ?? 0) - VISIBLE_LIMIT);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <BellIcon />
        {count > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-slate-950 ${
              hasRed ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notifications</p>
            {count > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{count}</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items === null && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
            {items?.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Nothing outstanding right now.</p>}
            {visibleItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2.5 border-b border-slate-50 px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.severity === "red" ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="min-w-0 flex-1 break-words leading-snug text-slate-700 dark:text-slate-300">{item.message}</span>
              </Link>
            ))}
            {hiddenCount > 0 && (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-center text-xs font-medium text-brand-orange hover:underline"
              >
                +{hiddenCount} more on the dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
