// Small, pure date helpers used anywhere CivFlow computes a statutory or
// contractual deadline (BIF Act payment schedule/response windows,
// Direction to Rectify clocks) or a "days until/overdue" display. Pulled
// into one tested module instead of the half-dozen near-identical copies
// that used to live in ask/route.ts, ai-file/route.ts, compliance.ts, the
// dashboard, and the Financials page — a bug in date math here is a missed
// statutory deadline, not just a cosmetic glitch, so it's worth getting
// right in one place.

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar days from now (e.g. the 35-day Direction to Rectify clock). */
export function addDays(days: number, from: Date = new Date()): string {
  return toDateInput(new Date(from.getTime() + days * 24 * 60 * 60 * 1000));
}

/** Business days (Mon-Fri) from now — used for the BIF Act's 15-business-day
 * payment schedule response window. */
export function addBusinessDays(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return toDateInput(d);
}

/** Whole days between today and a given YYYY-MM-DD date — negative if the
 * date is in the past.
 *
 * `dateStr` parses as UTC midnight (how JS reads a bare "YYYY-MM-DD"), so
 * "today" has to be pinned to UTC midnight too, not local midnight — mixing
 * the two silently shifted every result by a day for any Australian
 * timezone (AEST/AEDT are UTC+10/+11) whenever "now" fell before local
 * 10am/11am, which is exactly when a tradie is most likely checking
 * overdue counts on their phone. Route both sides through `toDateInput`
 * (also UTC-based) so they land on the same grid. */
export function daysBetween(dateStr: string, today: Date = new Date()): number {
  const diff = new Date(dateStr).getTime() - new Date(toDateInput(today)).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/** Whole days between two YYYY-MM-DD dates (to - from). */
export function daysBetweenDates(fromStr: string, toStr: string): number {
  const from = new Date(fromStr).setHours(0, 0, 0, 0);
  const to = new Date(toStr).setHours(0, 0, 0, 0);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/** Adds calendar days to a given YYYY-MM-DD date (e.g. forecasting a
 * completion date from schedule-impacting variation days). */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}
