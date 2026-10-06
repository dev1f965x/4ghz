import { describe, expect, it } from "vitest";
import { emptyGameChores } from "@/state/schema";
import { gameDayStart } from "@/time/clock";
import { GRACE_MS } from "@/time/days";
import { advanceChores, checkCycle, checkDaily, checklist } from "./model";

const HOUR = 3_600_000;
const name = (ko: string) => ({ ko });
const server = (at: string) => ({ kind: "server" as const, at });
const game = {
  schedule: [],
  codes: [],
  chores: [
    { id: "resin", name: name("레진"), cycle: "daily" as const, enabledByDefault: true },
    { id: "teapot", name: name("주전자"), cycle: "daily" as const, enabledByDefault: false },
    { id: "bosses", name: name("주간 보스"), cycle: "weekly" as const, enabledByDefault: true },
    { id: "abyss", name: name("나선 비경"), cycle: "periodic" as const, enabledByDefault: true },
    { id: "theater", name: name("환상극"), cycle: "periodic" as const, enabledByDefault: true },
  ],
  periods: [
    {
      id: "a1",
      choreId: "abyss",
      start: server("2026-09-16T04:00"),
      end: server("2026-10-16T04:00"),
    },
  ],
};

// Tuesday Oct 6, 10:42 in Korea; the Asia game day Oct 6 started at 05:00 Korea time.
const NOW = Date.parse("2026-10-06T01:42:00Z");
const started = (at: number) => advanceChores(game, emptyGameChores(), "asia", at);

describe("checklist", () => {
  it("lists enabled chores by cycle with their resets", () => {
    const list = checklist(game, started(NOW), "asia", NOW);
    expect(list.daily.items.map((i) => i.id)).toEqual(["resin"]);
    expect(list.daily.resetsAt).toBe(gameDayStart("2026-10-07", "asia"));
    expect(list.weekly).toMatchObject({
      key: "weekly:2026-10-05",
      resetsAt: gameDayStart("2026-10-12", "asia"),
    });
    expect(list.periodic.items).toEqual([
      expect.objectContaining({
        id: "abyss",
        key: "period:a1",
        endsAt: gameDayStart("2026-10-16", "asia"),
      }),
      // No current period: listed, but nothing can be checked.
      expect.objectContaining({ id: "theater", key: null, endsAt: null }),
    ]);
    expect(list.previous).toBeNull();
  });

  it("shows the previous day during the grace period, for a day that counts", () => {
    const installed = started(gameDayStart("2026-10-05", "asia") + HOUR);
    const inGrace = gameDayStart("2026-10-06", "asia") + HOUR;
    const list = checklist(game, advanceChores(game, installed, "asia", inGrace), "asia", inGrace);
    expect(list.previous).toMatchObject({
      label: "2026-10-05",
      editableUntil: gameDayStart("2026-10-06", "asia") + GRACE_MS,
    });
  });
});

describe("checking", () => {
  it("checks today's daily chores and refuses days that are closed", () => {
    const state = checkDaily(game, started(NOW), "asia", NOW, "2026-10-06", "resin", true);
    expect(checklist(game, state, "asia", NOW).daily.items[0].checked).toBe(true);
    expect(() => checkDaily(game, state, "asia", NOW, "2026-10-01", "resin", true)).toThrow();
  });

  it("checks and unchecks weekly and periodic chores in their cycle", () => {
    let state = checkCycle(started(NOW), NOW, "weekly:2026-10-05", "bosses", true);
    state = checkCycle(state, NOW, "period:a1", "abyss", true);
    let list = checklist(game, state, "asia", NOW);
    expect(list.weekly.items[0].checked).toBe(true);
    expect(list.periodic.items[0].checked).toBe(true);
    state = checkCycle(state, NOW, "weekly:2026-10-05", "bosses", false);
    list = checklist(game, state, "asia", NOW);
    expect(list.weekly.items[0].checked).toBe(false);
  });

  it("starts a new week unchecked after the Monday reset", () => {
    const state = checkCycle(started(NOW), NOW, "weekly:2026-10-05", "bosses", true);
    const nextWeek = gameDayStart("2026-10-12", "asia");
    expect(checklist(game, state, "asia", nextWeek).weekly.items[0].checked).toBe(false);
  });
});

describe("advanceChores", () => {
  it("keeps checks of a week for 7 days after it ends, then drops them", () => {
    const state = checkCycle(started(NOW), NOW, "weekly:2026-10-05", "bosses", true);
    const weekEnds = gameDayStart("2026-10-12", "asia");
    expect(advanceChores(game, state, "asia", weekEnds + 6 * 24 * HOUR).cycleChecks).toHaveProperty(
      "weekly:2026-10-05",
    );
    expect(advanceChores(game, state, "asia", weekEnds + 7 * 24 * HOUR).cycleChecks).toEqual({});
  });

  it("drops checks of a period the data file no longer has", () => {
    const state = checkCycle(started(NOW), NOW, "period:gone", "abyss", true);
    expect(advanceChores(game, state, "asia", NOW).cycleChecks).toEqual({});
  });

  it("records missed days while keeping cycle checks", () => {
    const installed = checkCycle(started(NOW), NOW, "period:a1", "abyss", true);
    const later = advanceChores(game, installed, "asia", gameDayStart("2026-10-09", "asia"));
    expect(Object.keys(later.days).sort()).toEqual(["2026-10-06", "2026-10-07"]);
    expect(later.cycleChecks).toHaveProperty("period:a1");
  });
});
