"use client";

import { useIsDark } from "@/lib/use-is-dark";
import { computeCriticalPath, type ScheduleEdge, type ScheduleTask } from "@/lib/schedule-calcs";
import type { Milestone } from "@/types/database";

// A real row-per-task Gantt, distinct from the point-in-time ProjectTimeline
// used on Financials: this one needs a start+end bar per milestone (driven
// by duration_days) and a critical-path highlight, which only makes sense
// once milestones have durations and dependencies (0033_milestone_dependencies.sql).

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

export function ScheduleGantt({
  milestones,
  edges,
  projectStartDate,
}: {
  milestones: Pick<Milestone, "id" | "name" | "status" | "target_date" | "duration_days">[];
  edges: ScheduleEdge[];
  projectStartDate: string | null;
}) {
  const isDark = useIsDark();

  if (!milestones.length) return null;

  const predecessorCount = new Map<string, number>(milestones.map((m) => [m.id, 0]));
  for (const e of edges) predecessorCount.set(e.successorId, (predecessorCount.get(e.successorId) ?? 0) + 1);

  const tasks: ScheduleTask[] = milestones.map((m) => ({
    id: m.id,
    durationDays: m.duration_days,
    anchorDate: (predecessorCount.get(m.id) ?? 0) === 0 ? m.target_date ?? projectStartDate ?? toDateInput(new Date()) : null,
  }));

  const computed = computeCriticalPath(tasks, edges);
  if (!computed) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        These milestones have a circular dependency (A depends on B which depends on A) — fix that in Sequencing below
        to see the schedule.
      </p>
    );
  }

  const { results, epochDate } = computed;

  const maxFinish = Math.max(1, ...[...results.values()].map((r) => r.earliestFinish));
  const width = 900;
  const rowHeight = 34;
  const marginLeft = 160;
  const marginRight = 20;
  const plotWidth = width - marginLeft - marginRight;
  const height = milestones.length * rowHeight + 30;

  const xFor = (dayOffset: number) => marginLeft + (dayOffset / maxFinish) * plotWidth;

  const axisColor = isDark ? "#334155" : "#e2e8f0";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const labelColor = isDark ? "#e2e8f0" : "#1e293b";
  const criticalColor = isDark ? "#f87171" : "#dc2626";
  const normalColor = isDark ? "#60a5fa" : "#3b82f6";

  const rows = milestones
    .map((m) => ({ m, r: results.get(m.id) }))
    .filter((x): x is { m: (typeof milestones)[number]; r: NonNullable<ReturnType<typeof results.get>> } => !!x.r)
    .sort((a, b) => a.r.earliestStart - b.r.earliestStart);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[600px]" style={{ height: "auto" }}>
        <line x1={marginLeft} y1={10} x2={marginLeft} y2={height - 20} stroke={axisColor} strokeWidth={1} />

        {rows.map(({ m, r }, i) => {
          const y = 20 + i * rowHeight;
          const x1 = xFor(r.earliestStart);
          const x2 = xFor(r.earliestFinish);
          const barColor = r.isCritical ? criticalColor : normalColor;
          const startDate = addDaysToDate(epochDate, r.earliestStart);
          const finishDate = addDaysToDate(epochDate, r.earliestFinish);
          return (
            <g key={m.id}>
              <text x={marginLeft - 8} y={y + 14} fontSize="10" fill={labelColor} textAnchor="end">
                {m.name.length > 22 ? `${m.name.slice(0, 21)}…` : m.name}
              </text>
              <rect
                x={x1}
                y={y}
                width={Math.max(2, x2 - x1)}
                height={16}
                rx={3}
                fill={barColor}
                opacity={m.status === "complete" ? 0.5 : 1}
              />
              <text x={x2 + 6} y={y + 12} fontSize="9" fill={textColor}>
                {startDate === finishDate ? startDate : `${startDate} → ${finishDate}`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: criticalColor }} />
          Critical path — no slack, drives the finish date
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: normalColor }} />
          Has slack
        </span>
      </div>
    </div>
  );
}
