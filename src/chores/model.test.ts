import { describe, expect, it } from "vitest";
import { emptyGameChores } from "@/state/schema";
import { gameDayStart } from "@/time/clock";
import { GRACE_MS } from "@/time/days";
import {
  advanceChores,
  advanceNeedsSave,
  checkCycle,
  checkDaily,
  checklist,
  nextChange,
} from "./model";

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

const DAY = 24 * HOUR;
const weekOf = (state: ReturnType<typeof started>, at: number) =>
  checkCycle(game, state, "asia", at, "weekly:2026-10-05", "bosses", true);

describe("checking", () => {
  it("checks today's daily chores and refuses days that are closed", () => {
    const state = checkDaily(game, started(NOW), "asia", NOW, "2026-10-06", "resin", true);
    expect(state).not.toBeNull();
    expect(state && checklist(game, state, "asia", NOW).daily.items[0].checked).toBe(true);
    expect(checkDaily(game, started(NOW), "asia", NOW, "2026-10-01", "resin", true)).toBeNull();
  });

  it("refuses the previous day once the grace period has ended", () => {
    const installed = started(gameDayStart("2026-10-05", "asia") + HOUR);
    const afterGrace = gameDayStart("2026-10-06", "asia") + GRACE_MS + 1000;
    const state = advanceChores(game, installed, "asia", afterGrace);
    expect(checkDaily(game, state, "asia", afterGrace, "2026-10-05", "resin", true)).toBeNull();
  });

  it("checks and unchecks weekly and periodic chores in their cycle", () => {
    let state = weekOf(started(NOW), NOW);
    state = state && checkCycle(game, state, "asia", NOW, "period:a1", "abyss", true);
    expect(state).not.toBeNull();
    if (state === null) return;
    expect(checklist(game, state, "asia", NOW).weekly.items[0].checked).toBe(true);
    expect(checklist(game, state, "asia", NOW).periodic.items[0].checked).toBe(true);
    const unchecked = checkCycle(game, state, "asia", NOW, "weekly:2026-10-05", "bosses", false);
    expect(unchecked && checklist(game, unchecked, "asia", NOW).weekly.items[0].checked).toBe(
      false,
    );
  });

  it("refuses a cycle that is not open, such as last week after the Monday reset", () => {
    const monday = gameDayStart("2026-10-12", "asia") + 5000;
    expect(weekOf(started(NOW), monday)).toBeNull();
    expect(checkCycle(game, started(NOW), "asia", NOW, "period:other", "abyss", true)).toBeNull();
    // A periodic chore with no current period accepts nothing.
    expect(checkCycle(game, started(NOW), "asia", NOW, "period:a1", "theater", true)).toBeNull();
  });

  it("starts a new week unchecked after the Monday reset", () => {
    const state = weekOf(started(NOW), NOW);
    const nextWeek = gameDayStart("2026-10-12", "asia");
    expect(state && checklist(game, state, "asia", nextWeek).weekly.items[0].checked).toBe(false);
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
    let state = advanceChores(game, checked(), "asia", weekEnds + HOUR);
    expect(state.cycleEndedAt).toEqual({ "weekly:2026-10-05": weekEnds + HOUR });
    state = advanceChores(game, state, "asia", weekEnds + HOUR + 7 * DAY - 1);
    expect(state.cycleChecks).toHaveProperty("weekly:2026-10-05");
    state = advanceChores(game, state, "asia", weekEnds + HOUR + 7 * DAY);
    expect(state.cycleChecks).toEqual({});
    expect(state.cycleEndedAt).toEqual({});
  });

  it("keeps cycle checks when a wrong clock jumps weeks ahead and back", () => {
    const wrong = weekEnds + 21 * DAY;
    let state = advanceChores(game, checked(), "asia", wrong);
    expect(state.cycleChecks).toHaveProperty("weekly:2026-10-05");
    state = advanceChores(game, state, "asia", NOW + 60_000);
    expect(checklist(game, state, "asia", NOW + 60_000).weekly.items[0].checked).toBe(true);
    // Back in the open week, the cycle is no longer marked as ended.
    expect(state.cycleEndedAt).toEqual({});
  });

  it("keeps checks of a period that left the data file for 7 days", () => {
    const withPeriod = checkCycle(game, started(NOW), "asia", NOW, "period:a1", "abyss", true);
    if (withPeriod === null) throw new Error("periodic check refused");
    const without = { ...game, periods: [] };
    let state = advanceChores(without, withPeriod, "asia", NOW + HOUR);
    expect(state.cycleChecks).toHaveProperty("period:a1");
    state = advanceChores(without, state, "asia", NOW + HOUR + 7 * DAY);
    expect(state.cycleChecks).toEqual({});
  });

  it("records missed days while keeping cycle checks", () => {
    const installed = checkCycle(game, started(NOW), "asia", NOW, "period:a1", "abyss", true);
    if (installed === null) throw new Error("periodic check refused");
    const later = advanceChores(game, installed, "asia", gameDayStart("2026-10-09", "asia"));
    expect(Object.keys(later.days).sort()).toEqual(["2026-10-06", "2026-10-07"]);
    expect(later.cycleChecks).toHaveProperty("period:a1");
  });
});

describe("advanceNeedsSave", () => {
  it("saves real changes and lastAdvancedAt only every 10 minutes", () => {
    const state = started(NOW);
    const tick = advanceChores(game, state, "asia", NOW + 30_000);
    expect(advanceNeedsSave(state, tick)).toBe(false);
    expect(advanceNeedsSave(state, advanceChores(game, state, "asia", NOW + 10 * 60_000))).toBe(
      true,
    );
    const nextDay = advanceChores(game, state, "asia", gameDayStart("2026-10-07", "asia"));
    expect(advanceNeedsSave(state, nextDay)).toBe(true);
  });
});

describe("nextChange", () => {
  it("is the earliest upcoming reset, grace end, or period end", () => {
    const list = checklist(game, started(NOW), "asia", NOW);
    expect(nextChange(list, NOW)).toBe(gameDayStart("2026-10-07", "asia"));
    const installed = started(gameDayStart("2026-10-05", "asia") + HOUR);
    const inGrace = gameDayStart("2026-10-06", "asia") + HOUR;
    const graceList = checklist(
      game,
      advanceChores(game, installed, "asia", inGrace),
      "asia",
      inGrace,
    );
    expect(nextChange(graceList, inGrace)).toBe(gameDayStart("2026-10-06", "asia") + GRACE_MS);
  });
});
