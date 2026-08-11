import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import OfflineBanner from "@/components/offline-banner";
import { ToastProvider } from "@/components/ui/toast";

// Deliberately using the system font stack for body copy (see globals.css)
// instead of next/font/google — this is a field tool that should build and
// run without depending on a Google Fonts fetch at build time.
//
// Headings use Space Grotesk for a bit of character, but it's self-hosted
// via @fontsource (static WOFF2 files shipped in the npm package itself,
// pinned by version like any other dependency) rather than next/font/google
// or a CDN link tag — so it still costs zero network requests at build or
// runtime, same as the system stack.
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";

export const metadata: Metadata = {
  title: "CivFlow — AI Site Diary Assistant",
  description:
    "Capture site photos and a voice note; CivFlow drafts the site diary, progress report, and compliance records for you.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CivFlow",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  viewportFit: "cover",
  // Field use means real phones, real thumbs — don't let the browser block
  // pinch-zoom for anyone who needs it to read a small label.
  width: "device-width",
  initialScale: 1,
};

// Runs before paint (blocking, in <head>) so there's no flash of the wrong
// theme. Reads the saved preference ("light" | "dark") if the person has
// ever toggled it; otherwise falls back to the OS preference for the very
// first visit. Applies the `dark` class that globals.css's @custom-variant
// hooks into. Kept in sync with the two-state cycle in theme-toggle.tsx.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("civflow-theme");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <OfflineBanner />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
