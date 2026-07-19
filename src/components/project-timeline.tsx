"use client";

import { useMemo } from "react";
import { useIsDark } from "@/lib/use-is-dark";
import type { MilestoneStatus } from "@/types/database";

// A lightweight visual schedule: not a full multi-row Gantt (milestones in
// this schema are single target/actual dates, not start+end tasks, so a
// true Gantt would need a schema change) but a horizontal timeline that
// plots every milestone along the project's start-to-completion axis,
// color-coded by status, with a "today" marker. Hand-rolled SVG rather than
// forcing recharts into a Gantt-shaped hole — simpler and fully under our
// control for a chart this specific.

type TimelineMilestone = {
  id: string;
  name: string;
  status: MilestoneStatus;
  target_date: string | null;
  actual_date: string | null;
};

const statusColor: Record<MilestoneStatus, { light: string; dark: string }> = {
  pending: { light: "#94a3b8", dark: "#64748b" },
  on_track: { light: "#10b981", dark: "#34d399" },
  at_risk: { light: "#f59e0b", dark: "#fbbf24" },
  delayed: { light: "#ef4444", dark: "#f87171" },
  complete: { light: "#3b82f6", dark: "#60a5fa" },
};

function toTime(d: string | null): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

export function ProjectTimeline({
  startDate,
  endDate,
  milestones,
}: {
  startDate: string | null;
  endDate: string | null;
  milestones: TimelineMilestone[];
}) {
  const isDark = useIsDark();
  // Date.now() is technically impure, but this is a "today" marker on a
  // schedule chart — memoized once per mount is exactly the desired
  // behavior, not a bug, so the purity rule is intentionally silenced here.
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);

  const milestoneDates = milestones
    .map((m) => toTime(m.actual_date) ?? toTime(m.target_date))
    .filter((t): t is number => t !== null);

  const candidateTimes = [toTime(startDate), toTime(endDate), ...milestoneDates].filter((t): t is number => t !== null);
  if (!candidateTimes.length) return null;

  const rangeStart = Math.min(...candidateTimes);
  const rangeEnd = Math.max(...candidateTimes, now);
  const span = Math.max(1, rangeEnd - rangeStart);

  const width = 800;
  const axisY = 90;
  const marginX = 40;
  const plotWidth = width - marginX * 2;

  const xFor = (t: number) => marginX + ((t - rangeStart) / span) * plotWidth;

  const axisColor = isDark ? "#334155" : "#e2e8f0";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const labelColor = isDark ? "#e2e8f0" : "#1e293b";
  const todayColor = isDark ? "#fb923c" : "#c2410c";

  const todayX = xFor(now);

  const points = milestones
    .map((m) => {
      const t = toTime(m.actual_date) ?? toTime(m.target_date);
      if (t === null) return null;
      return { ...m, t, x: xFor(t) };
    })
    .filter((p): p is TimelineMilestone & { t: number; x: number } => p !== null)
    .sort((a, b) => a.t - b.t);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} 160`} className="w-full min-w-[600px]" style={{ height: "auto" }}>
        <line x1={marginX} y1={axisY} x2={width - marginX} y2={axisY} stroke={axisColor} strokeWidth={2} />

        {startDate && (
          <text x={marginX} y={axisY + 22} fontSize="10" fill={textColor} textAnchor="start">
            Start {new Date(startDate).toLocaleDateString("en-AU",{ month: "short", day: "numeric" })}
          </text>
        )}
        {endDate && (
          <text x={width - marginX} y={axisY + 22} fontSize="10" fill={textColor} textAnchor="end">
            {new Date(endDate).toLocaleDateString("en-AU",{ month: "short", day: "numeric", year: "numeric" })}
          </text>
        )}

        {todayX >= marginX && todayX <= width - marginX && (
          <>
            <line x1={todayX} y1={axisY - 30} x2={todayX} y2={axisY + 10} stroke={todayColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <text x={todayX} y={axisY - 34} fontSize="10" fill={todayColor} textAnchor="middle" fontWeight={600}>
              Today
            </text>
          </>
        )}

        {points.map((p, i) => {
          const above = i % 2 === 0;
          const dotColor = statusColor[p.status]?.[isDark ? "dark" : "light"] ?? textColor;
          const labelY = above ? axisY + 20 : axisY - 14;
          const nameY = above ? axisY + 34 : axisY - 28;
          return (
            <g key={p.id}>
              <line x1={p.x} y1={axisY} x2={p.x} y2={above ? axisY + 10 : axisY - 10} stroke={dotColor} strokeWidth={1.5} />
              <circle cx={p.x} cy={axisY} r={4.5} fill={dotColor} />
              <text x={p.x} y={labelY} fontSize="9" fill={textColor} textAnchor="middle">
                {new Date(p.t).toLocaleDateString("en-AU",{ month: "short", day: "numeric" })}
              </text>
              <text x={p.x} y={nameY} fontSize="10" fill={labelColor} textAnchor="middle" fontWeight={500}>
                {p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
