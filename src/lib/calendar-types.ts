import type { BadgeTone } from "@/components/ui/badge";

export type CalendarItem = {
  id: string;
  type: string;
  label: string;
  date: string;
  href: string;
  projectName?: string;
};

export type ReminderLite = { id: string; title: string; due_date: string; project_id: string | null };

// One distinct colour per due-date type, shared between the badges shown in
// the day panel and the small dots shown on each calendar cell.
export const typeTone: Record<string, BadgeTone> = {
  Reminder: "emerald",
  RFI: "blue",
  DTR: "red",
  "Payment due": "amber",
  "Payment schedule": "yellow",
  "SWMS review": "cyan",
  Milestone: "slate",
  Inspection: "indigo",
  Defect: "rose",
  "DLP ends": "purple",
  "Licence expiry": "orange",
  "MFR report": "fuchsia",
  "Lead follow-up": "neutral",
};

// Solid dot colours for the calendar grid (badges use a soft tint instead,
// via the Badge component's own tone palette).
export const dotColor: Record<BadgeTone, string> = {
  neutral: "bg-slate-400",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  yellow: "bg-yellow-500",
  fuchsia: "bg-fuchsia-500",
  slate: "bg-slate-500",
};
