// Server clocks and cycle boundaries. All instants are UTC epoch milliseconds.
// Servers use fixed offsets without daylight saving time, so no time zone database is needed.

export const regions = ["asia", "america", "europe", "tw_hk_mo"] as const;
export type Region = (typeof regions)[number];

export type Time = { kind: "instant"; at: string } | { kind: "server"; at: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const OFFSET_MINUTES: Record<Region, number> = {
  asia: 480,
  tw_hk_mo: 480,
  europe: 60,
  america: -300,
};

// Daily chores reset at 04:00 server time; weekly chores at 04:00 on Monday.
const RESET_HOUR = 4;

function offsetMs(region: Region): number {
  return OFFSET_MINUTES[region] * MINUTE;
}

const SERVER_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
// An instant must carry its offset; without one, Date.parse would use the PC's time zone.
const INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:[0-5]\d(\.\d{1,3})?)?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/;
const LABEL = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Resolves a data file time to an instant; server-local times use the region's offset. */
export function toInstant(time: Time, region: Region): number {
  if (time.kind === "instant") {
    const m = INSTANT.exec(time.at);
    const ms = m && checkedUtc(m) !== null ? Date.parse(time.at) : Number.NaN;
    if (Number.isNaN(ms)) throw new Error(`Invalid instant: ${time.at}`);
    return ms;
  }
  const m = SERVER_TIME.exec(time.at);
  const utc = m ? checkedUtc(m) : null;
  if (utc === null) throw new Error(`Invalid server time: ${time.at}`);
  return utc - offsetMs(region);
}

/** Date.UTC of the matched date and time fields, or null when a field is out of range. */
function checkedUtc(m: RegExpExecArray): number | null {
  const [y, mo, d, h, mi] = m.slice(1, 6).map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi);
  // Date.UTC rolls over out-of-range fields (Feb 30 becomes Mar 2), so reject what does not round-trip.
  const back = new Date(utc);
  const same =
    back.getUTCFullYear() === y &&
    back.getUTCMonth() === mo - 1 &&
    back.getUTCDate() === d &&
    back.getUTCHours() === h &&
    back.getUTCMinutes() === mi;
  return same ? utc : null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The calendar date (YYYY-MM-DD) shown on a UTC-based Date. */
function dateLabel(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function labelToUtcMidnight(label: string): number {
  const m = LABEL.exec(label);
  if (!m) throw new Error(`Invalid label: ${label}`);
  const [, y, mo, d] = m.map(Number);
  return Date.UTC(y, mo - 1, d);
}

export function addDays(label: string, days: number): string {
  return dateLabel(new Date(labelToUtcMidnight(label) + days * DAY));
}

/** The game day that contains the instant, labeled with the server date on which it starts. */
export function gameDayLabel(instant: number, region: Region): string {
  return dateLabel(new Date(instant + offsetMs(region) - RESET_HOUR * HOUR));
}

/** When the game day with this label starts. */
export function gameDayStart(label: string, region: Region): number {
  return labelToUtcMidnight(label) + RESET_HOUR * HOUR - offsetMs(region);
}

export function gameDayEnd(label: string, region: Region): number {
  return gameDayStart(label, region) + DAY;
}

/** The weekly cycle containing the instant, labeled with its Monday. */
export function weekLabel(instant: number, region: Region): string {
  const day = gameDayLabel(instant, region);
  const weekday = new Date(labelToUtcMidnight(day)).getUTCDay(); // 0 is Sunday
  return addDays(day, -((weekday + 6) % 7));
}

export function weekEnd(label: string, region: Region): number {
  return gameDayStart(label, region) + 7 * DAY;
}

export type Period = { id: string; start: Time; end: Time };

/** The period that contains the instant; intervals are [start, end). */
export function currentPeriod<P extends Period>(
  periods: readonly P[],
  instant: number,
  region: Region,
): P | undefined {
  return periods.find(
    (p) => toInstant(p.start, region) <= instant && instant < toInstant(p.end, region),
  );
}
