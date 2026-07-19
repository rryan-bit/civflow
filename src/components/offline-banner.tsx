"use client";

import { useEffect, useState } from "react";

/** Persistent, non-dismissible banner while the browser reports no network
 * connection. Doesn't block anything — just makes sure a supervisor never
 * silently loses a photo/voice note upload because they assumed it saved. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // navigator.onLine is browser-only — read it once on mount, then track
    // changes via the online/offline events.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    setMounted(true);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!mounted || online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-white print:hidden">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M1 9a16 16 0 0 1 22 0M5 13a10 10 0 0 1 14 0M8.5 17a5 5 0 0 1 7 0M12 21h.01" opacity="0.5" />
        <path d="M2 2l20 20" />
      </svg>
      You&apos;re offline — new photos, voice notes, and AI features won&apos;t save until you reconnect.
    </div>
  );
}
