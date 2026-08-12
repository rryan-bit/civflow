"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import SignOutButton from "./sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import SearchBox from "./search-box";
import NotificationBell from "./notification-bell";

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

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
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
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const COLLAPSE_KEY = "civflow-sidebar-collapsed";
const SIDEBAR_VAR = "--sidebar-w";

/**
 * Owns the whole app shell (sidebar + content offset), not just the nav
 * itself. The sidebar can fold down to an icon-only rail to give the page
 * more room; both the rail's own width and the content area's left offset
 * read from one CSS variable (set on <html>) so they can never drift out
 * of sync as the fold state changes.
 */
export function AppShell({
  displayName,
  initial,
  children,
}: {
  displayName: string;
  initial: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Reads a browser-only API once on mount to restore the last fold
    // state — genuinely needs an effect, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(SIDEBAR_VAR, collapsed ? "4.5rem" : "16rem");
  }, [collapsed]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  }

  return (
    <div className="min-h-screen bg-background">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="app-header-safe-area fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-elevated transition-colors hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100 lg:hidden print:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Below lg, this is always full-width (w-64) regardless of the
         desktop fold preference — it's a temporary overlay drawer, so
         labels should stay readable. At lg+ it tracks --sidebar-w and the
         fold toggle becomes visible. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col overflow-hidden border-r border-slate-100 bg-white transition-transform duration-200 dark:border-slate-800/60 dark:bg-slate-950 lg:w-[var(--sidebar-w)] lg:translate-x-0 lg:transition-[width] print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex items-center px-5 py-5 app-header-safe-area">
          <Link href="/dashboard" className="flex items-center transition-opacity hover:opacity-80">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className={`ml-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 ${collapsed ? "lg:hidden" : ""}`}>
              CivFlow
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-elevated transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100 lg:flex"
          >
            <ChevronIcon direction={collapsed ? "right" : "left"} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
                  active
                    ? "bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/15"
                    : "text-slate-600 hover:bg-surface-hover hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                <span className="shrink-0">
                  <Icon />
                </span>
                <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800/60">
          <div className={`flex items-center gap-2 px-1 ${collapsed ? "lg:justify-center lg:gap-1.5" : ""}`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white dark:bg-brand-orange">
              {initial}
            </span>
            <span className={`min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300 ${collapsed ? "lg:hidden" : ""}`}>
              {displayName}
            </span>
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[var(--sidebar-w)] lg:transition-[padding] lg:duration-200">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-slate-100 bg-white/85 py-3 pl-16 pr-5 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/85 lg:pl-5 print:hidden">
          <SearchBox />
          <NotificationBell />
          <ThemeToggle />
        </header>
        <main className="app-bottom-safe-area mx-auto max-w-6xl px-5 pt-8">{children}</main>
      </div>
    </div>
  );
}
