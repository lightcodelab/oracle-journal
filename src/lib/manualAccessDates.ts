/**
 * Timezone-aware helpers for the canonical manual full-access model.
 *
 * All authoritative storage is UTC (ISO). Administrators interact in
 * Australia/Melbourne wall-clock time — presets add calendar months
 * with day-of-month clamping (never JavaScript's normalise-forward
 * rule) and DST transitions preserve the selected local wall-clock
 * where that time exists.
 *
 * Policy for non-existent (spring-forward gap) or duplicated
 * (autumn overlap) local times: use `toZonedTime` -> compose local
 * fields -> `fromZonedTime`. `fromZonedTime` resolves both cases
 * deterministically by treating the composed local time as if the
 * standard offset applied and letting the IANA rules pick the
 * canonical UTC instant. In practice:
 *   - gap  (2:00–3:00 AEST->AEDT): the missing local time resolves
 *     to the equivalent post-gap UTC instant.
 *   - overlap (3:00–2:00 AEDT->AEST): the ambiguous local time
 *     resolves to the later, standard-time UTC instant.
 * These are one-hour boundary corner cases only.
 */

import { format as dfFormat } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone, getTimezoneOffset } from "date-fns-tz";

export const TEMPLE_TIMEZONE = "Australia/Melbourne";

/**
 * Derive the Melbourne timezone abbreviation (AEST/AEDT) from the actual
 * IANA offset at the given instant. Node's ICU may format `zzz` as
 * "GMT+10" on minimal builds, so we compute the abbreviation ourselves.
 */
export function melbourneTzAbbr(instant: Date): string {
  const offsetMs = getTimezoneOffset(TEMPLE_TIMEZONE, instant);
  const offsetHours = Math.round(offsetMs / 3_600_000);
  return offsetHours === 11 ? "AEDT" : "AEST";
}

/** Days in a given (0-indexed) month of a Gregorian year, accounting for leap Feb. */
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * Add `months` calendar months to `instant`, interpreted in `Australia/Melbourne`.
 * - Preserves local wall-clock (h/m/s/ms).
 * - Preserves day-of-month when it exists; otherwise clamps to the final
 *   valid day of the destination month (never overflows into the next month).
 * Returns a new UTC Date.
 */
export function addCalendarMonthsMelbourne(instant: Date, months: number): Date {
  const local = toZonedTime(instant, TEMPLE_TIMEZONE);
  const y = local.getFullYear();
  const m = local.getMonth();
  const d = local.getDate();
  const hh = local.getHours();
  const mm = local.getMinutes();
  const ss = local.getSeconds();
  const ms = local.getMilliseconds();

  const targetMonthAbs = m + months;
  const targetYear = y + Math.floor(targetMonthAbs / 12);
  const targetMonth = ((targetMonthAbs % 12) + 12) % 12;
  const clampedDay = Math.min(d, daysInMonth(targetYear, targetMonth));

  // Build the target local wall-clock string; fromZonedTime converts to UTC.
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const localIso =
    `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}T` +
    `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad(ms, 3)}`;
  return fromZonedTime(localIso, TEMPLE_TIMEZONE);
}

/**
 * Format an authoritative UTC instant for administrator preview:
 *   "31 August 2026 at 5:00 pm AEST (Australia/Melbourne)"
 */
export function formatMelbourneLong(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const datePart = formatInTimeZone(d, TEMPLE_TIMEZONE, "d MMMM yyyy");
  const timePart = formatInTimeZone(d, TEMPLE_TIMEZONE, "h:mm a").toLowerCase();
  const tzAbbr = melbourneTzAbbr(d);
  return `${datePart} at ${timePart} ${tzAbbr} (Australia/Melbourne)`;
}

/** Short variant for list rows: "31 Aug 2026, 5:00 pm AEST" */
export function formatMelbourneShort(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return (
    formatInTimeZone(d, TEMPLE_TIMEZONE, "d MMM yyyy, h:mm a").replace(/AM|PM/, (m) => m.toLowerCase()) +
    " " +
    melbourneTzAbbr(d)
  );
}

/** True when `end` is strictly after `start`. */
export function isValidWindow(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}

/** Utility purely for tests: obtain the ISO of a Melbourne local wall-clock. */
export function melbourneWallClockToUtc(
  y: number, mo1: number, d: number, hh = 0, mm = 0, ss = 0,
): Date {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const iso = `${y}-${pad(mo1)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return fromZonedTime(iso, TEMPLE_TIMEZONE);
}

/** Format audit-actor UUID as an obfuscated tag: "admin•ab12cd". Never surface full identity. */
export function shortActor(uuid: string | null | undefined): string {
  if (!uuid) return "system";
  return "admin•" + uuid.replace(/-/g, "").slice(0, 6);
}

/** Format a plain UTC timestamp for compact audit rows. */
export function formatAuditTimestamp(instant: string): string {
  return formatMelbourneShort(instant);
}

/** Re-export a passthrough of date-fns format for convenience where TZ is not needed. */
export const formatPlain = dfFormat;
