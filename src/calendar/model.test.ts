import { describe, expect, it } from "vitest";
import { advanceChores, checkDaily, type GameData } from "@/chores/model";
import { emptyGameChores, type GameChores, type GameId } from "@/state/schema";
import { gameDayStart } from "@/time/clock";
import { addMonths, calendarDay, calendarMonth, firstMonth, monthLabels } from "./model";

const HOUR = 3_600_000;
const game: GameData = {
  schedule: [],
  codes: [],
  chores: [
    { id: "resin", name: { ko: "레진" }, cycle: "daily", enabledByDefault: true },
    { id: "bosses", name: { ko: "주간 보스" }, cycle: "weekly", enabledByDefault: true },
  ],
  periods: [],
};
const noDaily: GameData = { ...game, chores: [game.chores[1]] };
const games = { genshin: game, hsr: game, zzz: noDaily };

// Tuesday Oct 6, 10:42 in Korea.
const NOW = Date.parse("2026-10-06T01:42:00Z");
const fresh = (at: number) =>
  Object.fromEntries(
    (["genshin", "hsr", "zzz"] as const).map((g) => [
      g,
      advanceChores(games[g], emptyGameChores(), "asia", at),
    ]),
  ) as Record<GameId, GameChores>;
const check = (state: GameChores, data: GameData, at: number, label: string) => {
  const next = checkDaily(data, state, "asia", at, label, "resin", true);
  if (next === null) throw new Error(`${label} is closed`);
  return next;
};

describe("month layout", () => {
  it("fills weeks from Monday to Sunday", () => {
    const weeks = monthLabels("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-09-28");
    expect(weeks[4][6]).toBe("2026-11-01");
    // February 2027 starts on a Monday and ends on a Sunday: exactly four weeks.
    expect(monthLabels("2027-02")).toHaveLength(4);
  });

  it("moves across years", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
});

describe("calendarDay", () => {
  it("marks today live, upcoming days empty, and leaves days before tracking unrecorded", () => {
    const chores = fresh(NOW);
    chores.genshin = check(chores.genshin, game, NOW, "2026-10-06");
    const input = { chores, games, region: "asia" as const, now: NOW };
    expect(calendarDay(input, "2026-10-06", "2026-10")).toMatchObject({
      status: "today",
      games: { genshin: "done", hsr: "not-done", zzz: "untracked" },
      all: false,
    });
    expect(calendarDay(input, "2026-10-07", "2026-10")).toMatchObject({
      status: "upcoming",
      games: { genshin: "none", hsr: "none", zzz: "none" },
    });
    expect(calendarDay(input, "2026-10-05", "2026-10")).toMatchObject({
      status: "past",
      games: { genshin: "none", hsr: "none", zzz: "none" },
      all: false,
    });
  });

  it("highlights a day when every tracked game is done, ignoring untracked ones", () => {
    let chores = fresh(NOW);
    chores.genshin = check(chores.genshin, game, NOW, "2026-10-06");
    chores.hsr = check(chores.hsr, game, NOW, "2026-10-06");
    const input = { chores, games, region: "asia" as const, now: NOW };
    expect(calendarDay(input, "2026-10-06", "2026-10").all).toBe(true);

    // After the grace period the day is fixed and keeps its result.
    const later = gameDayStart("2026-10-07", "asia") + 3 * HOUR;
    chores = Object.fromEntries(
      Object.entries(chores).map(([g, s]) => [
        g,
        advanceChores(games[g as GameId], s, "asia", later),
      ]),
    ) as Record<GameId, GameChores>;
    expect(calendarDay({ ...input, chores, now: later }, "2026-10-06", "2026-10")).toMatchObject({
      status: "past",
      games: { genshin: "done", hsr: "done", zzz: "untracked" },
      all: true,
    });
  });

  it("shows the previous day as pending during the grace period", () => {
    const inGrace = gameDayStart("2026-10-07", "asia") + HOUR;
    const chores = fresh(NOW);
    const input = { chores, games, region: "asia" as const, now: inGrace };
    const day = calendarDay(
      {
        ...input,
        chores: { ...chores, genshin: check(chores.genshin, game, inGrace, "2026-10-06") },
      },
      "2026-10-06",
      "2026-10",
    );
    expect(day).toMatchObject({ status: "pending", games: { genshin: "done", hsr: "not-done" } });
  });

  it("shows stored results without data, and no live marks", () => {
    const chores = fresh(NOW);
    chores.genshin = {
      ...chores.genshin,
      days: { "2026-10-01": { result: "done", fixedAt: NOW } },
    };
    const input = { chores, games: null, region: "asia" as const, now: NOW };
    expect(calendarDay(input, "2026-10-01", "2026-10").games.genshin).toBe("done");
    expect(calendarDay(input, "2026-10-06", "2026-10").games.genshin).toBe("none");
  });

  it("flags the days outside the month", () => {
    const input = { chores: fresh(NOW), games, region: "asia" as const, now: NOW };
    const weeks = calendarMonth(input, "2026-10");
    expect(weeks[0].map((d) => d.inMonth)).toEqual([false, false, false, true, true, true, true]);
  });
});

describe("firstMonth", () => {
  it("is the month of the earliest record, or the current month", () => {
    const chores = fresh(NOW);
    expect(firstMonth(chores, "2026-10")).toBe("2026-10");
    chores.hsr = { ...chores.hsr, days: { "2026-08-31": { result: "not-done", fixedAt: NOW } } };
    expect(firstMonth(chores, "2026-10")).toBe("2026-08");
  });
});
