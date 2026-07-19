import { describe, it, expect } from "vitest";
import { toDateInput, addDays, addBusinessDays, daysBetween, daysBetweenDates, addDaysToDate } from "./dates";

describe("toDateInput", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toDateInput(new Date("2026-07-16T05:00:00Z"))).toBe("2026-07-16");
  });
});

describe("addDays", () => {
  it("adds calendar days from a given date, including weekends", () => {
    // Thursday 2026-07-16 + 5 calendar days = Tuesday 2026-07-21
    expect(addDays(5, new Date("2026-07-16T00:00:00Z"))).toBe("2026-07-21");
  });

  it("handles 0 days as a no-op", () => {
    expect(addDays(0, new Date("2026-07-16T00:00:00Z"))).toBe("2026-07-16");
  });

  it("crosses a month boundary", () => {
    expect(addDays(10, new Date("2026-07-25T00:00:00Z"))).toBe("2026-08-04");
  });
});

describe("addBusinessDays", () => {
  it("skips weekends when counting forward", () => {
    // Thursday 2026-07-16: +1 business day = Friday 2026-07-17
    expect(addBusinessDays(1, new Date("2026-07-16T00:00:00Z"))).toBe("2026-07-17");
    // +2 business days from Thursday = Monday 2026-07-20 (skips Sat/Sun)
    expect(addBusinessDays(2, new Date("2026-07-16T00:00:00Z"))).toBe("2026-07-20");
  });

  it("matches the BIF Act 15-business-day window across a weekend", () => {
    // Friday 2026-07-17 + 15 business days should land 3 weekends later.
    const result = addBusinessDays(15, new Date("2026-07-17T00:00:00Z"));
    const resultDate = new Date(result);
    // Must not fall on a weekend.
    expect([0, 6]).not.toContain(resultDate.getUTCDay());
  });

  it("starting from a weekend still only counts weekdays", () => {
    // Saturday 2026-07-18 + 1 business day = Monday 2026-07-20
    expect(addBusinessDays(1, new Date("2026-07-18T00:00:00Z"))).toBe("2026-07-20");
  });
});

describe("daysBetween", () => {
  it("is negative for a past date", () => {
    expect(daysBetween("2026-07-10", new Date("2026-07-16T00:00:00Z"))).toBe(-6);
  });

  it("is positive for a future date", () => {
    expect(daysBetween("2026-07-26", new Date("2026-07-16T00:00:00Z"))).toBe(10);
  });

  it("is zero for today", () => {
    expect(daysBetween("2026-07-16", new Date("2026-07-16T00:00:00Z"))).toBe(0);
  });
});

describe("daysBetweenDates", () => {
  it("computes whole days from one date string to another", () => {
    expect(daysBetweenDates("2026-07-16", "2026-07-26")).toBe(10);
  });

  it("is negative when to precedes from", () => {
    expect(daysBetweenDates("2026-07-26", "2026-07-16")).toBe(-10);
  });
});

describe("addDaysToDate", () => {
  it("adds calendar days to a YYYY-MM-DD string", () => {
    expect(addDaysToDate("2026-07-16", 15)).toBe("2026-07-31");
  });

  it("supports negative offsets", () => {
    expect(addDaysToDate("2026-07-16", -5)).toBe("2026-07-11");
  });
});
