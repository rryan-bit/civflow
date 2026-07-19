"use client";

import { useEffect, useState } from "react";

// Deliberately just light/dark — a third "system" state used to sit between
// them, but it meant one click in three could look like it did nothing
// (toggling into "system" when the OS preference already matched the
// current look is visually a no-op, which read as a broken button). Every
// click here always flips the visible theme. The OS preference still picks
// the starting point on someone's very first visit, before they've chosen.

type Theme = "light" | "dark";

const STORAGE_KEY = "civflow-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const ICONS: Record<Theme, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v1.5M10 16v1.5M17.5 10H16M4 10H2.5M15.3 4.7l-1 1M5.7 14.3l-1 1M15.3 15.3l-1-1M5.7 5.7l-1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M17 11.5A7 7 0 0 1 8.5 3 7 7 0 1 0 17 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark" };

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reads browser-only APIs once on mount and syncs into state — genuinely
    // needs an effect, not derivable during render.
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // Avoid rendering theme-dependent content before we know the resolved
  // preference, so the button doesn't flicker between icons on load.
  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Theme: ${LABELS[theme]} (click to switch to ${LABELS[theme === "dark" ? "light" : "dark"]})`}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {ICONS[theme]}
    </button>
  );
}
