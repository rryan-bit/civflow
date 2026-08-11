"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import SignOutButton from "./sign-out-button";

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const LeadsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const TeamIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MessagesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const EquipmentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const ComplianceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ReportsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/leads", label: "Leads", icon: LeadsIcon },
  { href: "/team", label: "Team", icon: TeamIcon },
  { href: "/messages", label: "Messages", icon: MessagesIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/equipment", label: "Equipment", icon: EquipmentIcon },
  { href: "/compliance", label: "Compliance", icon: ComplianceIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
];

/**
 * Vertical nav rail — replaced the old horizontal top nav so the app reads
 * more like a desktop workspace (per Ryan's Quicken reference). Always
 * present on lg+ as a fixed left rail; below that it's an off-canvas
 * drawer behind a hamburger toggle, since this is still a tool people check
 * on a phone on site.
 */
export function AppSidebar({
  displayName,
  initial,
}: {
  displayName: string;
  initial: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="app-header-safe-area fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-elevated transition-colors hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100 lg:hidden print:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-slate-100 bg-white transition-transform duration-200 dark:border-slate-800/60 dark:bg-slate-950 lg:translate-x-0 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="app-header-safe-area flex items-center px-5 py-5">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/15"
                    : "text-slate-600 hover:bg-surface-hover hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800/60">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white dark:bg-brand-orange">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
