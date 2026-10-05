import { describe, expect, it } from "vitest";
import { formatDateTime, timeLeft } from "./format";

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
