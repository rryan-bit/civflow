import type { Metadata } from "next";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";

// Deliberately using the system font stack (see globals.css) instead of
// next/font/google — this is a field tool that should build and run without
// depending on a Google Fonts fetch at build time.

export const metadata: Metadata = {
  title: "CivFlow — AI Site Diary Assistant",
  description:
    "Capture site photos and a voice note; CivFlow drafts the site diary, progress report, and compliance records for you.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CivFlow",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
