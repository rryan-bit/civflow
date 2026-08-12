import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button-styles";
import { tileTint } from "@/lib/tile-tints";
import ThemeToggle from "@/components/theme-toggle";

const IconStroke = ({ children }: { children: React.ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const DiaryIcon = () => (
  <IconStroke>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h6" />
  </IconStroke>
);
const ShieldIcon = () => (
  <IconStroke>
    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </IconStroke>
);
const PortalIcon = () => (
  <IconStroke>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </IconStroke>
);
const AiIcon = () => (
  <IconStroke>
    <path d="M12 3a9 9 0 0 0-7.5 14L3 21l4.2-1.4A9 9 0 1 0 12 3Z" />
    <path d="M9 10h.01M12 10h.01M15 10h.01" />
  </IconStroke>
);
const SubcontractorIcon = () => (
  <IconStroke>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </IconStroke>
);
const ChartIcon = () => (
  <IconStroke>
    <path d="M3 3v18h18" />
    <path d="M7 16l4-6 3 3 5-7" />
  </IconStroke>
);

const FEATURES = [
  {
    icon: <DiaryIcon />,
    title: "AI site diary",
    description:
      "Snap photos, leave a voice note. CivFlow drafts the diary entry, labour log, equipment log, weather, and safety observations for you to review and approve.",
  },
  {
    icon: <ShieldIcon />,
    title: "QBCC compliance, watched",
    description:
      "Deposit caps, Home Warranty Insurance, BIF Act payment schedules, MFR reporting, licence expiry — tracked automatically and flagged before they become a problem.",
  },
  {
    icon: <PortalIcon />,
    title: "Client portal & reports",
    description:
      "A no-login link showing progress, photos, and billing status, plus a one-click printable client report. \"Where are we up to?\" gets a two-second answer.",
  },
  {
    icon: <AiIcon />,
    title: "Ask CivFlow",
    description:
      "Log a delivery, hours worked, an RFI, or spin up a whole new project just by describing it in plain English — from the dashboard or inside any project.",
  },
  {
    icon: <SubcontractorIcon />,
    title: "Subcontractors, sorted",
    description:
      "Quotes, SWMS, retention, and insurance/licence expiry tracked per subbie — with a no-login portal so they submit their own updates without a phone call.",
  },
  {
    icon: <ChartIcon />,
    title: "Leads to live margin",
    description:
      "Run enquiries through to a won job, then track cost, billing, and schedule per project — with a portfolio report across everything you're building.",
  },
];

export function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(700px circle at 15% 0%, rgb(249 115 22 / 0.10), transparent 60%), radial-gradient(800px circle at 90% 10%, rgb(30 58 95 / 0.12), transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonStyles("ghost", "md")}>
            Sign in
          </Link>
          <Link href="/login?mode=sign-up" className={buttonStyles("primary", "md")}>
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />
          Built for Queensland builders
        </span>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          The site diary and compliance tracker built for small builders.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 dark:text-slate-400 sm:text-lg">
          Snap a photo, leave a voice note — CivFlow drafts the diary, watches your QBCC deposit caps, insurance, and
          payment deadlines, and tells you the second something needs attention. No spreadsheets, no chasing subbies
          for updates.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login?mode=sign-up" className={buttonStyles("primary", "lg")}>
            Start free
          </Link>
          <a href="#features" className={buttonStyles("outline", "lg")}>
            See what&apos;s inside
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Free to get started — no credit card, set up in minutes.</p>
      </section>

      {/* Product preview */}
      <section className="relative z-10 mx-auto mt-14 max-w-4xl px-5">
        <div className="relative">
          <div className="surface-card overflow-hidden p-0" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300 dark:bg-red-500/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300 dark:bg-amber-500/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 dark:bg-emerald-500/40" />
            </div>
            <div className="bg-background p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Welcome back, Ryan</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">Overview</h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  4 active projects
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Safety flags", value: "0", tone: "text-slate-900 dark:text-slate-100" },
                  { label: "Awaiting review", value: "2", tone: "text-amber-600 dark:text-amber-400" },
                  { label: "Payment claims due", value: "1", tone: "text-amber-600 dark:text-amber-400" },
                  { label: "Open RFIs", value: "3", tone: "text-slate-900 dark:text-slate-100" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface p-3">
                    <p className={`text-xl font-semibold ${s.tone}`}>{s.value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl bg-surface dark:divide-slate-800/80">
                <div className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Home Warranty Insurance premium due within 14 days — 14 Bellara St
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">Everything else on track — nothing else flagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating AI-action callout, echoing the in-app Ask CivFlow chat */}
          <div className="absolute -bottom-6 -right-4 hidden w-64 rounded-2xl border border-emerald-200 bg-white p-3.5 dark:border-emerald-900/60 dark:bg-slate-900 sm:block" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-[10px] font-semibold text-white dark:bg-brand-orange">
                AI
              </span>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ask CivFlow</p>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Logged 12 roof trusses for the Chen job.
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto mt-24 max-w-6xl px-5 scroll-mt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Everything a small building company actually needs
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Not a stripped-down version of enterprise construction software — built from scratch for a QLD builder
            running a handful of jobs at once.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="surface-card p-6">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tileTint(i)}`}>{f.icon}</span>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why QLD-specific */}
      <section className="relative z-10 mx-auto mt-24 max-w-4xl px-5 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Built around QBCC obligations, not bolted on
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Generic project-management tools weren&apos;t built with the Queensland Building and Construction
          Commission in mind. CivFlow was — deposit caps, Home Warranty Insurance, the BIF Act&apos;s payment
          schedule timeframes, and Minimum Financial Requirements reporting windows are built into the product, not
          a checklist you have to remember yourself.
        </p>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto mt-24 max-w-4xl px-5 pb-10">
        <div className="rounded-3xl bg-brand-navy px-8 py-12 text-center dark:bg-slate-900">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Ready to get your paperwork sorted?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Set up your company and create your first project in a couple of minutes.
          </p>
          <Link href="/login?mode=sign-up" className={buttonStyles("primary", "lg", "mt-6")}>
            Start free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-8 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row">
        <Logo textClassName="text-sm" />
        <p>© {new Date().getFullYear()} CivFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
