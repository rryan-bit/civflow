"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether dark mode is currently active by watching the `dark` class
 * on <html> (toggled by theme-toggle.tsx / the blocking init script in
 * layout.tsx). Needed for anything that can't be themed with Tailwind's
 * `dark:` variant alone — chiefly SVG-based chart libraries like recharts,
 * which take raw color strings as props rather than className.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
