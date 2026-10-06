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

/** Time left until an instant, in whole minutes, as days, hours, and minutes. */
export function timeLeft(
  from: number,
  to: number,
): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, Math.floor((to - from) / 60_000));
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  };
}

/** "10:42" today, "Oct 5, 21:10" on another day, in the local time zone. */
export function formatUpdated(instant: number, now: number, locale: Locale, timeZone?: string) {
  const day = (t: number) =>
    new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone }).format(t);
  if (day(instant) !== day(now)) return formatDateTime(instant, locale, timeZone);
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(instant);
}
