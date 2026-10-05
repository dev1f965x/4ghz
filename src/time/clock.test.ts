import { describe, expect, it } from "vitest";
import {
  addDays,
  currentPeriod,
  gameDayEnd,
  gameDayLabel,
  gameDayStart,
  type Region,
  toInstant,
  weekEnd,
  weekLabel,
} from "./clock";

const utc = (iso: string) => Date.parse(iso);

describe("toInstant", () => {
  it.each<[Region, string, string]>([
    ["asia", "2026-10-16T04:00", "2026-10-15T20:00:00Z"],
    ["tw_hk_mo", "2026-10-16T04:00", "2026-10-15T20:00:00Z"],
    ["europe", "2026-10-16T04:00", "2026-10-16T03:00:00Z"],
    ["america", "2026-10-16T04:00", "2026-10-16T09:00:00Z"],
  ])("resolves server time in %s", (region, at, expected) => {
    expect(toInstant({ kind: "server", at }, region)).toBe(utc(expected));
  });

  it("keeps a global instant the same in every region", () => {
    const at = "2026-11-04T06:00:00+08:00";
    for (const region of ["asia", "europe", "america"] as const) {
      expect(toInstant({ kind: "instant", at }, region)).toBe(utc("2026-11-03T22:00:00Z"));
    }
  });

  it("rejects malformed times", () => {
    expect(() => toInstant({ kind: "server", at: "2026-10-16 04:00" }, "asia")).toThrow();
    expect(() => toInstant({ kind: "instant", at: "soon" }, "asia")).toThrow();
  });
});

describe("game days", () => {
  // 2026-10-06 10:42 KST is 01:42 UTC (Wireframes reference moment).
  const now = utc("2026-10-06T01:42:00Z");

  it.each<[Region, string]>([
    ["asia", "2026-10-06"],
    ["tw_hk_mo", "2026-10-06"],
    // Europe server time is 02:42 on Oct 6, before its 04:00 reset.
    ["europe", "2026-10-05"],
    // America server time is 20:42 on Oct 5.
    ["america", "2026-10-05"],
  ])("labels the current game day in %s", (region, label) => {
    expect(gameDayLabel(now, region)).toBe(label);
  });

  it.each<[Region, string, string]>([
    ["asia", "2026-10-05T20:00:00Z", "2026-10-06T20:00:00Z"],
    ["europe", "2026-10-06T03:00:00Z", "2026-10-07T03:00:00Z"],
    ["america", "2026-10-06T09:00:00Z", "2026-10-07T09:00:00Z"],
  ])("starts and ends the 2026-10-06 game day in %s", (region, start, end) => {
    expect(gameDayStart("2026-10-06", region)).toBe(utc(start));
    expect(gameDayEnd("2026-10-06", region)).toBe(utc(end));
  });

  it("switches exactly at the reset", () => {
    const reset = gameDayStart("2026-10-06", "asia");
    expect(gameDayLabel(reset - 1, "asia")).toBe("2026-10-05");
    expect(gameDayLabel(reset, "asia")).toBe("2026-10-06");
  });

  it.each([
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-03-01", -1, "2026-02-28"],
  ])("adds days across month and year boundaries: %s %+d", (label, days, expected) => {
    expect(addDays(label, days)).toBe(expected);
  });
});

describe("weeks", () => {
  it.each<[string, Region, string]>([
    // Monday 2026-10-05 05:00 KST is the first moment of the Asia week.
    ["2026-10-04T20:00:00Z", "asia", "2026-10-05"],
    // One minute earlier is still the previous week.
    ["2026-10-04T19:59:00Z", "asia", "2026-09-28"],
    // Sunday evening in Korea, Sunday morning on the America server.
    ["2026-10-11T12:00:00Z", "america", "2026-10-05"],
    // Across a month boundary.
    ["2026-11-01T12:00:00Z", "asia", "2026-10-26"],
  ])("labels the week at %s in %s", (iso, region, label) => {
    expect(weekLabel(utc(iso), region)).toBe(label);
  });

  it("ends a week seven days after its Monday reset", () => {
    expect(weekEnd("2026-10-05", "america")).toBe(utc("2026-10-12T09:00:00Z"));
  });
});

describe("currentPeriod", () => {
  const periods = [
    {
      id: "a",
      start: { kind: "server", at: "2026-09-16T04:00" },
      end: { kind: "server", at: "2026-10-16T04:00" },
    },
    {
      id: "b",
      start: { kind: "server", at: "2026-10-16T04:00" },
      end: { kind: "server", at: "2026-11-16T04:00" },
    },
  ] as const;

  it("uses half-open intervals", () => {
    const boundary = toInstant({ kind: "server", at: "2026-10-16T04:00" }, "asia");
    expect(currentPeriod(periods, boundary - 1, "asia")?.id).toBe("a");
    expect(currentPeriod(periods, boundary, "asia")?.id).toBe("b");
  });

  it("resolves the same period boundary later on the America server", () => {
    const asiaBoundary = toInstant({ kind: "server", at: "2026-10-16T04:00" }, "asia");
    expect(currentPeriod(periods, asiaBoundary, "america")?.id).toBe("a");
  });

  it("returns nothing outside every period", () => {
    expect(currentPeriod(periods, utc("2027-01-01T00:00:00Z"), "asia")).toBeUndefined();
  });
});
