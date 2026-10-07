// Display in the user's Windows time zone. Formatters are created per call so a time zone change
// applies without a restart (Design Doc, Spike results).

export type Locale = "ko" | "en";

/** Date and time in the local time zone; `timeZone` exists for tests. */
export function formatDateTime(instant: number, locale: Locale, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(instant);
}

/**
 * Time left until an instant as days, hours, and minutes. Minutes round up, with at least one,
 * so a countdown never shows zero while the entry still runs. (The wireframes rounded.)
 */
export function timeLeft(
  from: number,
  to: number,
): { days: number; hours: number; minutes: number } {
  const total = Math.max(1, Math.ceil((to - from) / 60_000));
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  };
}
function sameLocalDay(a: number, b: number, timeZone?: string) {
  const day = (t: number) =>
    new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone }).format(t);
  return day(a) === day(b);
}

export function formatTime(instant: number, locale: Locale, timeZone?: string) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(instant);
}

/** "10:42" today, "Oct 5, 21:10" on another day, in the local time zone. */
export function formatUpdated(instant: number, now: number, locale: Locale, timeZone?: string) {
  return sameLocalDay(instant, now, timeZone)
    ? formatTime(instant, locale, timeZone)
    : formatDateTime(instant, locale, timeZone);
}

/** A game-day label such as "2026-10-05" as "Oct 5" / "10월 5일"; labels are server dates. */
export function formatLabelDate(label: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.parse(`${label}T00:00:00Z`));
}

/** True when `instant` falls on the local day after `now`'s. */
export function isTomorrow(instant: number, now: number, timeZone?: string) {
  const date = (t: number) =>
    new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone }).format(t);
  // Calendar arithmetic on the date label, so daylight saving changes cannot shift the day.
  const next = new Date(`${date(now)}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return date(instant) === next.toISOString().slice(0, 10);
}

/** "Mon, Oct 12, 05:00" / "10월 12일 (월) 05:00": weekly resets name the day of the week. */
export function formatDateTimeWithWeekday(instant: number, locale: Locale, timeZone?: string) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(instant);
}

/** "Nov 4, 07:00 – 12:00" within one local day, the full end date otherwise. */
export function formatRange(start: number, end: number, locale: Locale, timeZone?: string) {
  const to = sameLocalDay(start, end, timeZone)
    ? formatTime(end, locale, timeZone)
    : formatDateTime(end, locale, timeZone);
  return `${formatDateTime(start, locale, timeZone)} – ${to}`;
}

/** "2026-10" as "October 2026" / "2026년 10월". */
export function formatMonth(month: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(Date.parse(`${month}-01T00:00:00Z`));
}

/** A game-day label as "Tuesday, October 6" / "10월 6일 화요일", for a day's accessible name. */
export function formatLabelLong(label: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.parse(`${label}T00:00:00Z`));
}

/** Short weekday names from Monday, as the month grid's column headers. */
export function weekdayNames(locale: Locale) {
  const format = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  // 2026-10-05 is a Monday.
  return Array.from({ length: 7 }, (_, i) => format.format(Date.UTC(2026, 9, 5 + i)));
}
