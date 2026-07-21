import { describe, it, expect } from "vitest";
import {
  addCalendarMonthsMelbourne,
  formatMelbourneLong,
  isValidWindow,
  melbourneWallClockToUtc,
} from "../manualAccessDates";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "Australia/Melbourne";

function melbFields(d: Date) {
  return {
    y: Number(formatInTimeZone(d, TZ, "yyyy")),
    m: Number(formatInTimeZone(d, TZ, "M")),
    d: Number(formatInTimeZone(d, TZ, "d")),
    h: Number(formatInTimeZone(d, TZ, "H")),
    min: Number(formatInTimeZone(d, TZ, "m")),
  };
}

describe("addCalendarMonthsMelbourne — day clamping", () => {
  it("31 Jan 2026 + 1 month clamps to 28 Feb 2026 (non-leap)", () => {
    const start = melbourneWallClockToUtc(2026, 1, 31, 10, 0);
    const out = addCalendarMonthsMelbourne(start, 1);
    const f = melbFields(out);
    expect([f.y, f.m, f.d, f.h, f.min]).toEqual([2026, 2, 28, 10, 0]);
  });

  it("29 Feb 2028 + 12 months clamps to 28 Feb 2029 (non-leap)", () => {
    const start = melbourneWallClockToUtc(2028, 2, 29, 9, 30);
    const out = addCalendarMonthsMelbourne(start, 12);
    const f = melbFields(out);
    expect([f.y, f.m, f.d]).toEqual([2029, 2, 28]);
  });

  it("30 Nov 2025 + 3 months clamps to 28 Feb 2026", () => {
    const start = melbourneWallClockToUtc(2025, 11, 30, 14, 0);
    const out = addCalendarMonthsMelbourne(start, 3);
    const f = melbFields(out);
    expect([f.y, f.m, f.d]).toEqual([2026, 2, 28]);
  });

  it("31 Mar + 1 month clamps to 30 Apr (never rolls to 1 May)", () => {
    const start = melbourneWallClockToUtc(2026, 3, 31, 12, 0);
    const out = addCalendarMonthsMelbourne(start, 1);
    const f = melbFields(out);
    expect([f.m, f.d]).toEqual([4, 30]);
  });

  it("31 Jan 2028 + 1 month → 29 Feb 2028 (leap year)", () => {
    const start = melbourneWallClockToUtc(2028, 1, 31, 10, 0);
    const out = addCalendarMonthsMelbourne(start, 1);
    const f = melbFields(out);
    expect([f.y, f.m, f.d]).toEqual([2028, 2, 29]);
  });
});

describe("addCalendarMonthsMelbourne — DST transitions", () => {
  it("preserves 10:00 local across DST-end (April, +6 months → October)", () => {
    // 2 Apr 2026 10:00 AEDT → 2 Oct 2026 10:00 AEST
    const start = melbourneWallClockToUtc(2026, 4, 2, 10, 0);
    const out = addCalendarMonthsMelbourne(start, 6);
    const f = melbFields(out);
    expect([f.y, f.m, f.d, f.h, f.min]).toEqual([2026, 10, 2, 10, 0]);
  });

  it("preserves 10:00 local across DST-start (October, +6 months → April)", () => {
    const start = melbourneWallClockToUtc(2026, 10, 15, 10, 0);
    const out = addCalendarMonthsMelbourne(start, 6);
    const f = melbFields(out);
    expect([f.y, f.m, f.d, f.h, f.min]).toEqual([2027, 4, 15, 10, 0]);
  });
});

describe("validation & formatting", () => {
  it("isValidWindow requires strict start<end", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-01-01T00:00:01Z");
    expect(isValidWindow(a, b)).toBe(true);
    expect(isValidWindow(b, a)).toBe(false);
    expect(isValidWindow(a, a)).toBe(false);
  });

  it("formatMelbourneLong exposes date, time, tz and IANA name", () => {
    const d = melbourneWallClockToUtc(2026, 8, 31, 17, 0);
    const s = formatMelbourneLong(d);
    expect(s).toMatch(/31 August 2026/);
    expect(s).toMatch(/5:00 pm/);
    expect(s).toMatch(/AEST/);
    expect(s).toMatch(/Australia\/Melbourne/);
  });

  it("formatMelbourneLong shows AEDT in daylight-saving months", () => {
    const d = melbourneWallClockToUtc(2026, 1, 15, 10, 0);
    expect(formatMelbourneLong(d)).toMatch(/AEDT/);
  });
});
