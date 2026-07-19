"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // In dev, an active service worker from a previous session can keep
      // serving stale cached pages after every code change — exactly the
      // "old text still showing" bug this caused. Unregister instead of
      // registering, so dev always reflects what's actually on disk.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app still works without offline/installable support.
    });
  }, []);

  return null;
}
