"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReminderRow } from "@/components/reminders/reminder-row";
import { type CalendarItem, type ReminderLite, typeTone, dotColor } from "@/lib/calendar-types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function MonthCalendar({ items, reminders }: { items: CalendarItem[]; reminders: ReminderLite[] }) {
  const today = todayStr();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const reminderMap = useMemo(() => new Map(reminders.map((r) => [`reminder-${r.id}`, r])), [reminders]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  const overdue = useMemo(() => items.filter((i) => daysUntil(i.date) < 0).sort((a, b) => a.date.localeCompare(b.date)), [items]);

  const presentTypes = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);

  const weeks = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const startWeekday = monthStart.getDay(); // 0 = Sun
    const offset = startWeekday === 0 ? 6 : startWeekday - 1; // Monday-start offset
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

    const cells: { day: number; dateStr: string }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - offset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        cells.push({ day: 0, dateStr: "" });
      } else {
        cells.push({ day: dayNumber, dateStr: toDateStr(viewYear, viewMonth, dayNumber) });
      }
    }

    const result: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [viewYear, viewMonth]);

  function goToMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function goToToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(today);
  }

  function jumpTo(dateStr: string) {
    const d = new Date(dateStr);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(dateStr);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-AU",{ month: "long", year: "numeric" });
  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const selectedLabel = new Date(selectedDate).toLocaleDateString("en-AU",{ weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      {overdue.length > 0 && (
        <Card className="mb-4 border-red-200/80 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-300">
            {overdue.length} overdue item{overdue.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {overdue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpTo(item.date)}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-red-800 shadow-sm hover:bg-red-100 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/60"
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{monthLabel}</h2>
            <button type="button" onClick={goToToday} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:border-brand-orange/40 hover:text-brand-orange dark:border-slate-700 dark:text-slate-400 dark:hover:text-brand-orange">
              Today
            </button>
          </div>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-2">
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              if (!cell.dateStr) return <div key={`${wi}-${di}`} />;
              const dayItems = itemsByDate.get(cell.dateStr) ?? [];
              const isToday = cell.dateStr === today;
              const isSelected = cell.dateStr === selectedDate;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className="flex flex-col items-center justify-start gap-1 py-0.5"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-navy font-semibold text-white shadow-sm dark:bg-brand-orange"
                        : isToday
                          ? "border-2 border-brand-orange font-semibold text-brand-orange"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <span className="flex h-1.5 items-center justify-center gap-0.5">
                    {dayItems.slice(0, 4).map((item) => (
                      <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${dotColor[typeTone[item.type] ?? "neutral"]}`} />
                    ))}
                    {dayItems.length > 4 && <span className="text-[9px] leading-none text-slate-400">+{dayItems.length - 4}</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {presentTypes.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {presentTypes.map((type) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className={`h-2 w-2 rounded-full ${dotColor[typeTone[type] ?? "neutral"]}`} />
                {type}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedLabel}</h3>
        <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {selectedItems.map((item) => {
            const reminder = reminderMap.get(item.id);
            if (reminder) {
              return <ReminderRow key={item.id} id={reminder.id} title={reminder.title} dueDate={reminder.due_date} projectName={item.projectName} />;
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-slate-900 dark:text-slate-100">{item.label}</p>
                  {item.projectName && <p className="text-xs text-slate-500 dark:text-slate-400">{item.projectName}</p>}
                </div>
                <Badge tone={typeTone[item.type] ?? "neutral"} className="shrink-0">{item.type}</Badge>
              </Link>
            );
          })}
          {!selectedItems.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Nothing due this day.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
