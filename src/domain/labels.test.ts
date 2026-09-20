import { describe, expect, it } from "vitest";
import { formatFetchedAt, phaseLabel } from "./labels";

describe("phaseLabel", () => {
  it.each([
    [{ status: "today" } as const, "오늘"],
    [{ status: "running" } as const, "진행 중"],
    [{ status: "upcoming", daysUntil: 3 } as const, "3일 남음"],
    [{ status: "over" } as const, "종료"],
  ])("says %j is %s", (phase, expected) => {
    expect(phaseLabel(phase)).toBe(expected);
  });
});

describe("formatFetchedAt", () => {
  const now = new Date("2026-10-01T12:00:00");

  it.each([
    [new Date("2026-10-01T11:59:40"), "방금"],
    [new Date("2026-10-01T11:48:00"), "12분 전"],
    [new Date("2026-10-01T09:00:00"), "3시간 전"],
  ])("reads %s as %s", (fetchedAt, expected) => {
    expect(formatFetchedAt(fetchedAt, now)).toBe(expected);
  });

  it("falls back to a date once it is older than a day", () => {
    expect(formatFetchedAt(new Date("2026-09-28T12:00:00"), now)).toBe("9월 28일");
  });
});
