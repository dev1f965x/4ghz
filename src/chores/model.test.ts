import { describe, expect, it } from "vitest";
import { emptyGameChores } from "@/state/schema";
import { gameDayStart } from "@/time/clock";
import { GRACE_MS } from "@/time/days";
import {
  advanceChores,
  advanceNeedsSave,
  changeGameRegion,
  checkCycle,
  checkDaily,
  checklist,
  type GamePrefs,
  nextChange,
} from "./model";

const HOUR = 3_600_000;
const ASIA: GamePrefs = { plays: true, region: "asia", overrides: {} };
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
const started = (at: number) => advanceChores(game, emptyGameChores(), ASIA, at);

describe("checklist", () => {
  it("lists enabled chores by cycle with their resets", () => {
    const list = checklist(game, started(NOW), ASIA, NOW);
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
    const list = checklist(game, advanceChores(game, installed, ASIA, inGrace), ASIA, inGrace);
    expect(list.previous).toMatchObject({
      label: "2026-10-05",
      editableUntil: gameDayStart("2026-10-06", "asia") + GRACE_MS,
    });
  });
});

const DAY = 24 * HOUR;
const weekOf = (state: ReturnType<typeof started>, at: number) =>
  checkCycle(game, state, ASIA, at, "weekly:2026-10-05", "bosses", true);

describe("checking", () => {
  it("checks today's daily chores and refuses days that are closed", () => {
    const state = checkDaily(game, started(NOW), ASIA, NOW, "2026-10-06", "resin", true);
    expect(state).not.toBeNull();
    expect(state && checklist(game, state, ASIA, NOW).daily.items[0].checked).toBe(true);
    expect(checkDaily(game, started(NOW), ASIA, NOW, "2026-10-01", "resin", true)).toBeNull();
  });

  it("refuses the previous day once the grace period has ended", () => {
    const installed = started(gameDayStart("2026-10-05", "asia") + HOUR);
    const afterGrace = gameDayStart("2026-10-06", "asia") + GRACE_MS + 1000;
    const state = advanceChores(game, installed, ASIA, afterGrace);
    expect(checkDaily(game, state, ASIA, afterGrace, "2026-10-05", "resin", true)).toBeNull();
  });

  it("checks and unchecks weekly and periodic chores in their cycle", () => {
    let state = weekOf(started(NOW), NOW);
    state = state && checkCycle(game, state, ASIA, NOW, "period:a1", "abyss", true);
    expect(state).not.toBeNull();
    if (state === null) return;
    expect(checklist(game, state, ASIA, NOW).weekly.items[0].checked).toBe(true);
    expect(checklist(game, state, ASIA, NOW).periodic.items[0].checked).toBe(true);
    const unchecked = checkCycle(game, state, ASIA, NOW, "weekly:2026-10-05", "bosses", false);
    expect(unchecked && checklist(game, unchecked, ASIA, NOW).weekly.items[0].checked).toBe(false);
  });

  it("refuses a cycle that is not open, such as last week after the Monday reset", () => {
    const monday = gameDayStart("2026-10-12", "asia") + 5000;
    expect(weekOf(started(NOW), monday)).toBeNull();
    expect(checkCycle(game, started(NOW), ASIA, NOW, "period:other", "abyss", true)).toBeNull();
    // A periodic chore with no current period accepts nothing.
    expect(checkCycle(game, started(NOW), ASIA, NOW, "period:a1", "theater", true)).toBeNull();
  });

  it("starts a new week unchecked after the Monday reset", () => {
    const state = weekOf(started(NOW), NOW);
    const nextWeek = gameDayStart("2026-10-12", "asia");
    expect(state && checklist(game, state, ASIA, nextWeek).weekly.items[0].checked).toBe(false);
  });
});

describe("advanceChores", () => {
  const checked = () => {
    const state = weekOf(started(NOW), NOW);
    if (state === null) throw new Error("weekly check refused");
    return state;
  };
  const weekEnds = gameDayStart("2026-10-12", "asia");

  it("keeps checks of an ended week for 7 days after the app saw it end", () => {
    let state = advanceChores(game, checked(), ASIA, weekEnds + HOUR);
    expect(state.cycleEndedAt).toEqual({ "weekly:2026-10-05": weekEnds + HOUR });
    state = advanceChores(game, state, ASIA, weekEnds + HOUR + 7 * DAY - 1);
    expect(state.cycleChecks).toHaveProperty("weekly:2026-10-05");
    state = advanceChores(game, state, ASIA, weekEnds + HOUR + 7 * DAY);
    expect(state.cycleChecks).toEqual({});
    expect(state.cycleEndedAt).toEqual({});
  });

  it("keeps cycle checks when a wrong clock jumps weeks ahead and back", () => {
    const wrong = weekEnds + 21 * DAY;
    let state = advanceChores(game, checked(), ASIA, wrong);
    expect(state.cycleChecks).toHaveProperty("weekly:2026-10-05");
    state = advanceChores(game, state, ASIA, NOW + 60_000);
    expect(checklist(game, state, ASIA, NOW + 60_000).weekly.items[0].checked).toBe(true);
    // Back in the open week, the cycle is no longer marked as ended.
    expect(state.cycleEndedAt).toEqual({});
  });

  it("keeps checks of a period that left the data file for 7 days", () => {
    const withPeriod = checkCycle(game, started(NOW), ASIA, NOW, "period:a1", "abyss", true);
    if (withPeriod === null) throw new Error("periodic check refused");
    const without = { ...game, periods: [] };
    let state = advanceChores(without, withPeriod, ASIA, NOW + HOUR);
    expect(state.cycleChecks).toHaveProperty("period:a1");
    state = advanceChores(without, state, ASIA, NOW + HOUR + 7 * DAY);
    expect(state.cycleChecks).toEqual({});
  });

  it("records missed days while keeping cycle checks", () => {
    const installed = checkCycle(game, started(NOW), ASIA, NOW, "period:a1", "abyss", true);
    if (installed === null) throw new Error("periodic check refused");
    const later = advanceChores(game, installed, ASIA, gameDayStart("2026-10-09", "asia"));
    expect(Object.keys(later.days).sort()).toEqual(["2026-10-06", "2026-10-07"]);
    expect(later.cycleChecks).toHaveProperty("period:a1");
  });
});

describe("advanceNeedsSave", () => {
  it("saves real changes, and lastAdvancedAt 10 minutes after the last save", () => {
    const saved = started(NOW);
    // Ticks every 30 seconds, each applied in memory without saving.
    let memory = saved;
    const ticks: boolean[] = [];
    for (let at = NOW + 30_000; at <= NOW + 10 * 60_000; at += 30_000) {
      const next = advanceChores(game, memory, ASIA, at);
      ticks.push(advanceNeedsSave(memory, next, saved.lastAdvancedAt));
      memory = next;
    }
    expect(ticks.slice(0, -1).every((t) => !t)).toBe(true);
    expect(ticks.at(-1)).toBe(true);
    const nextDay = advanceChores(game, saved, ASIA, gameDayStart("2026-10-07", "asia") - 60_000);
    expect(advanceNeedsSave(saved, nextDay, nextDay.lastAdvancedAt)).toBe(false);
    const fixed = advanceChores(game, saved, ASIA, gameDayStart("2026-10-07", "asia") + 3 * HOUR);
    expect(advanceNeedsSave(saved, fixed, fixed.lastAdvancedAt)).toBe(true);
  });
});

describe("nextChange", () => {
  it("is the earliest upcoming reset, grace end, or period end", () => {
    const list = checklist(game, started(NOW), ASIA, NOW);
    expect(nextChange(list, NOW)).toBe(gameDayStart("2026-10-07", "asia"));
    const installed = started(gameDayStart("2026-10-05", "asia") + HOUR);
    const inGrace = gameDayStart("2026-10-06", "asia") + HOUR;
    const graceList = checklist(game, advanceChores(game, installed, ASIA, inGrace), ASIA, inGrace);
    expect(nextChange(graceList, inGrace)).toBe(gameDayStart("2026-10-06", "asia") + GRACE_MS);
  });
});

describe("settings", () => {
  it("lets the user turn chores on and off", () => {
    const prefs = { ...ASIA, overrides: { teapot: true, resin: false } };
    const list = checklist(game, started(NOW), prefs, NOW);
    expect(list.daily.items.map((i) => i.id)).toEqual(["teapot"]);
  });

  it("accepts no checks for a game the user does not play", () => {
    const off = { ...ASIA, plays: false };
    expect(checkDaily(game, started(NOW), off, NOW, "2026-10-06", "resin", true)).toBeNull();
    expect(
      checkCycle(game, started(NOW), off, NOW, "weekly:2026-10-05", "bosses", true),
    ).toBeNull();
  });
});

describe("changeGameRegion", () => {
  // Oct 6, 10:42 in Korea; the America day labeled Oct 6 starts Oct 6, 18:00 Korea time.
  const withHistory = () =>
    advanceChores(game, started(gameDayStart("2026-10-04", "asia")), ASIA, NOW);

  it("keeps today's checks and resumes with the next America day", () => {
    const state = checkDaily(game, withHistory(), ASIA, NOW, "2026-10-06", "resin", true);
    if (state === null) throw new Error("check refused");
    const change = changeGameRegion(game, state, ASIA, "america", NOW);
    expect(change.today).toEqual({ label: "2026-10-06", outcome: "kept" });
    expect(change.resumesAt).toBe(gameDayStart("2026-10-07", "america"));
    expect(change.next.days["2026-10-06"]?.result).toBe("done");
  });

  it("drops a day without checks and resumes with the America day of the same label", () => {
    const change = changeGameRegion(game, withHistory(), ASIA, "america", NOW);
    expect(change.today).toEqual({ label: "2026-10-06", outcome: "dropped" });
    expect(change.resumesAt).toBe(gameDayStart("2026-10-06", "america"));
    expect(change.next.days["2026-10-06"]).toBeUndefined();
  });

  it("changes nothing between servers with the same reset", () => {
    const change = changeGameRegion(game, withHistory(), ASIA, "tw_hk_mo", NOW);
    expect(change.today.outcome).toBe("none");
  });
});
