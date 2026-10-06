import { describe, expect, it } from "vitest";
import { formatDateTime, formatUpdated, timeLeft } from "./format";

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
  it.each([
    [0, 0, { days: 0, hours: 0, minutes: 0 }],
    [0, 14 * 86_400_000 + 18 * 3_600_000 + 18 * 60_000, { days: 14, hours: 18, minutes: 18 }],
    [10, 0, { days: 0, hours: 0, minutes: 0 }],
  ])("from %d to %d", (from, to, expected) => {
    expect(timeLeft(from, to)).toEqual(expected);
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
