import { describe, expect, it } from "vitest";
import { formatDateTime, formatRange, formatUpdated, timeLeft } from "./format";

describe("formatDateTime", () => {
  // The Asia reset (04:00 server time) is a fixed instant; local display follows each zone's rules.
  const reset = Date.parse("2026-11-01T20:00:00Z");

  it.each([
    ["Asia/Seoul", "ko", "11월 2일 05:00"],
    // New York leaves daylight saving time on 2026-11-01, so the same instant is 15:00, not 16:00.
    ["America/New_York", "en", "Nov 1, 15:00"],
    ["Europe/Berlin", "en", "Nov 1, 21:00"],
  ] as const)("shows the reset in %s", (zone, locale, expected) => {
    expect(formatDateTime(reset, locale, zone)).toBe(expected);
  });

  it("shows the hour before the change in New York with daylight saving time", () => {
    expect(formatDateTime(Date.parse("2026-10-31T20:00:00Z"), "en", "America/New_York")).toBe(
      "Oct 31, 16:00",
    );
  });
});

describe("timeLeft", () => {
  const MIN = 60_000;
  it.each([
    [59_000, { days: 0, hours: 0, minutes: 1 }],
    [MIN, { days: 0, hours: 0, minutes: 1 }],
    [MIN + 1_000, { days: 0, hours: 0, minutes: 2 }],
    [60 * MIN, { days: 0, hours: 1, minutes: 0 }],
    [1440 * MIN, { days: 1, hours: 0, minutes: 0 }],
    [14 * 86_400_000 + 18 * 3_600_000 + 18 * MIN, { days: 14, hours: 18, minutes: 18 }],
    // Already over: still one minute, since the entry leaves the list on the next update.
    [-10_000, { days: 0, hours: 0, minutes: 1 }],
  ])("%d ms before the end", (ms, expected) => {
    expect(timeLeft(0, ms)).toEqual(expected);
  });
});
describe("formatUpdated", () => {
  const at = Date.parse("2026-10-06T01:42:00Z");

  it.each([
    // Same local day in Seoul (10:42 and 23:00 on Oct 6): only the time.
    ["Asia/Seoul", Date.parse("2026-10-06T14:00:00Z"), "ko", "10:42"],
    // The next local day in Seoul: the date as well.
    ["Asia/Seoul", Date.parse("2026-10-06T16:00:00Z"), "ko", "10월 6일 10:42"],
    // In New York the same instant is 21:42 on Oct 5, and "now" is still Oct 5 there.
    ["America/New_York", Date.parse("2026-10-06T03:00:00Z"), "en", "21:42"],
    ["America/New_York", Date.parse("2026-10-06T05:00:00Z"), "en", "Oct 5, 21:42"],
  ] as const)("in %s at %d", (zone, now, locale, expected) => {
    expect(formatUpdated(at, now, locale, zone)).toBe(expected);
  });
});

describe("formatRange", () => {
  it.each([
    // 06:00 to 11:00 UTC+8 is 07:00 to 12:00 in Seoul, on one day.
    [
      "Asia/Seoul",
      "2026-11-04T06:00:00+08:00",
      "2026-11-04T11:00:00+08:00",
      "ko",
      "11월 4일 07:00 – 12:00",
    ],
    [
      "Asia/Seoul",
      "2026-10-01T03:00:00+08:00",
      "2026-10-21T04:00:00+08:00",
      "ko",
      "10월 1일 04:00 – 10월 21일 05:00",
    ],
    // The same window crosses midnight in New York.
    [
      "America/New_York",
      "2026-11-04T06:00:00+08:00",
      "2026-11-04T14:00:00+08:00",
      "en",
      "Nov 3, 17:00 – Nov 4, 01:00",
    ],
  ] as const)("in %s from %s to %s", (zone, start, end, locale, expected) => {
    expect(formatRange(Date.parse(start), Date.parse(end), locale, zone)).toBe(expected);
  });
});
