import { describe, expect, it } from "vitest";
import { gameDayEnd, gameDayStart, type Region } from "./clock";
import {
  advance,
  type Context,
  changeRegion,
  editableDays,
  emptyGameDays,
  type GameDays,
  GRACE_MS,
  isAllDone,
  setDailyCheck,
} from "./days";

const utc = (iso: string) => Date.parse(iso);
const HOUR = 3_600_000;

const chores = [
  { id: "commissions", enabled: true },
  { id: "resin", enabled: true },
];

function ctx(now: number, region: Region = "asia", overrides: Partial<Context> = {}): Context {
  return { now, region, plays: true, dailyChores: chores, ...overrides };
}

/** Installs the app at `at` and returns the advanced state. */
function install(at: number, region: Region = "asia"): GameDays {
  return advance(emptyGameDays(), ctx(at, region));
}

function checkAll(state: GameDays, c: Context, label: string): GameDays {
  return chores.reduce((s, chore) => setDailyCheck(s, c, label, chore.id, true), state);
}

// Asia game day labels start at 05:00 Korea time (20:00 UTC the day before).
const asiaStart = (label: string) => gameDayStart(label, "asia");

describe("first run", () => {
  it("counts chores immediately and starts with the current game day", () => {
    const now = asiaStart("2026-10-06") + 5 * HOUR;
    const state = install(now);
    expect(state.initialized).toBe(true);
    expect(state.countFrom).toBe(asiaStart("2026-10-06"));
    const done = checkAll(state, ctx(now), "2026-10-06");
    const next = advance(done, ctx(asiaStart("2026-10-07") + GRACE_MS));
    expect(next.days["2026-10-06"]?.result).toBe("done");
  });

  it("never records the day before installation, even inside its grace period", () => {
    const now = asiaStart("2026-10-06") + 30 * 60_000;
    const state = install(now);
    expect(editableDays(state, ctx(now))).toEqual(["2026-10-06"]);
    const later = advance(state, ctx(asiaStart("2026-10-08")));
    expect(later.days["2026-10-05"]).toBeUndefined();
  });

  it("makes chores that load after the first run wait a cycle", () => {
    const now = asiaStart("2026-10-06") + HOUR;
    const noChores = advance(emptyGameDays(), ctx(now, "asia", { dailyChores: [] }));
    expect(noChores.firstSeen).toEqual({});
    const withChores = advance(noChores, ctx(now + HOUR));
    // Chores added after the first data load wait for the next cycle.
    expect(withChores.firstSeen.commissions).toBe(now + HOUR);
  });
});

describe("fixing days", () => {
  const installed = install(asiaStart("2026-10-01"));

  it("records not-done for missed days when the app was closed", () => {
    const later = advance(installed, ctx(asiaStart("2026-10-05") + 3 * HOUR));
    expect(Object.keys(later.days).sort()).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(Object.values(later.days).every((d) => d.result === "not-done")).toBe(true);
  });

  it("waits for the grace period before fixing a day", () => {
    const end = asiaStart("2026-10-02");
    expect(advance(installed, ctx(end + GRACE_MS - 1)).days["2026-10-01"]).toBeUndefined();
    expect(advance(installed, ctx(end + GRACE_MS)).days["2026-10-01"]).toBeDefined();
  });

  it("lets the previous day be checked during the grace period", () => {
    const now = asiaStart("2026-10-02") + HOUR;
    expect(editableDays(installed, ctx(now))).toEqual(["2026-10-02", "2026-10-01"]);
    const done = checkAll(installed, ctx(now), "2026-10-01");
    expect(advance(done, ctx(now + GRACE_MS)).days["2026-10-01"]?.result).toBe("done");
    expect(() =>
      setDailyCheck(installed, ctx(now + GRACE_MS), "2026-10-01", "resin", true),
    ).toThrow();
  });

  it("lets the previous day be checked after a restart during the grace period", () => {
    const now = asiaStart("2026-10-02") + HOUR;
    const restarted = advance(installed, ctx(now));
    expect(restarted.days["2026-10-01"]).toBeUndefined();
    const done = checkAll(restarted, ctx(now), "2026-10-01");
    expect(advance(done, ctx(now + GRACE_MS)).days["2026-10-01"]?.result).toBe("done");
  });

  it("removes a check when it is unchecked", () => {
    const now = asiaStart("2026-10-01") + HOUR;
    const checked = checkAll(installed, ctx(now), "2026-10-01");
    const unchecked = setDailyCheck(checked, ctx(now), "2026-10-01", "resin", false);
    expect(unchecked.dailyChecks["2026-10-01"]).toEqual({ commissions: now });
    const later = advance(unchecked, ctx(asiaStart("2026-10-02") + GRACE_MS));
    expect(later.days["2026-10-01"]?.result).toBe("not-done");
  });

  it("rejects checks of unknown or disabled chores", () => {
    const now = asiaStart("2026-10-01") + HOUR;
    expect(() => setDailyCheck(installed, ctx(now), "2026-10-01", "unknown", true)).toThrow();
    const off = ctx(now, "asia", { dailyChores: [{ id: "resin", enabled: false }] });
    expect(() => setDailyCheck(installed, off, "2026-10-01", "resin", true)).toThrow();
  });

  it("never mutates its inputs", () => {
    const deepFreeze = <T>(value: T): T => {
      if (value && typeof value === "object") {
        for (const v of Object.values(value)) deepFreeze(v);
        Object.freeze(value);
      }
      return value;
    };
    const now = asiaStart("2026-10-02") + HOUR;
    const frozen = deepFreeze(advance(installed, ctx(now)));
    const checked = deepFreeze(checkAll(frozen, ctx(now), "2026-10-01"));
    expect(() => advance(checked, ctx(asiaStart("2026-10-09")))).not.toThrow();
    expect(() => changeRegion(checked, ctx(now), "america")).not.toThrow();
  });

  it("fixes a long gap in linear time", () => {
    const started = performance.now();
    const later = advance(installed, ctx(asiaStart("2036-10-01")));
    expect(Object.keys(later.days)).toHaveLength(3652);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("records missed days on the Europe server", () => {
    const europe = install(gameDayStart("2026-10-01", "europe"), "europe");
    const later = advance(europe, ctx(gameDayStart("2026-10-03", "europe") + GRACE_MS, "europe"));
    expect(Object.keys(later.days).sort()).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("is idempotent", () => {
    const at = ctx(asiaStart("2026-10-05"));
    const once = advance(installed, at);
    expect(advance(once, at)).toEqual(once);
  });

  it("marks a played game with no enabled daily chores as untracked", () => {
    const off = chores.map((c) => ({ ...c, enabled: false }));
    const later = advance(installed, ctx(asiaStart("2026-10-03"), "asia", { dailyChores: off }));
    expect(later.days["2026-10-01"]?.result).toBe("untracked");
  });

  it("records nothing for a game that is not played", () => {
    const later = advance(installed, ctx(asiaStart("2026-10-03"), "asia", { plays: false }));
    expect(later.days).toEqual({});
    expect(later.lastFixedLabel).toBe("2026-10-01");
  });

  it("counts a chore added later only from the next cycle", () => {
    const addedAt = asiaStart("2026-10-01") + 6 * HOUR;
    const withNew = advance(
      installed,
      ctx(addedAt, "asia", { dailyChores: [...chores, { id: "pot", enabled: true }] }),
    );
    const c = ctx(addedAt, "asia", { dailyChores: [...chores, { id: "pot", enabled: true }] });
    const done = checkAll(withNew, c, "2026-10-01");
    const later = advance(
      done,
      ctx(asiaStart("2026-10-03") + GRACE_MS, "asia", { dailyChores: c.dailyChores }),
    );
    // The new chore did not count on Oct 1, so checking the old chores was enough.
    expect(later.days["2026-10-01"]?.result).toBe("done");
    expect(later.days["2026-10-02"]?.result).toBe("not-done");
  });

  it("drops checks of fixed days after a week", () => {
    const done = checkAll(installed, ctx(asiaStart("2026-10-01") + HOUR), "2026-10-01");
    // Oct 1 is fixed when its grace period ends; retention counts from then.
    const fixed = advance(done, ctx(asiaStart("2026-10-02") + GRACE_MS));
    expect(advance(fixed, ctx(asiaStart("2026-10-09"))).dailyChecks["2026-10-01"]).toBeDefined();
    expect(
      advance(fixed, ctx(asiaStart("2026-10-09") + GRACE_MS)).dailyChecks["2026-10-01"],
    ).toBeUndefined();
  });
});

describe("region changes", () => {
  // Wireframes reference: Tuesday 2026-10-06 10:42 Korea time.
  const now = utc("2026-10-06T01:42:00Z");
  const base = install(asiaStart("2026-10-01"));

  it("Asia to America with checks today: fixes today and resumes on the America Oct 7 day", () => {
    const state = setDailyCheck(advance(base, ctx(now)), ctx(now), "2026-10-06", "resin", true);
    const moved = changeRegion(state, ctx(now), "america");
    expect(moved.days["2026-10-06"]?.result).toBe("not-done");
    // America Oct 7 starts at 18:00 Korea time on Oct 7.
    expect(moved.countFrom).toBe(utc("2026-10-07T09:00:00Z"));
    expect(editableDays(moved, ctx(now, "america"))).toEqual([]);
  });

  it("Asia to America without checks today: discards today and resumes on the America Oct 6 day", () => {
    const moved = changeRegion(advance(base, ctx(now)), ctx(now), "america");
    expect(moved.days["2026-10-06"]).toBeUndefined();
    expect(moved.countFrom).toBe(utc("2026-10-06T09:00:00Z"));
  });

  it("keeps the gap and the old records after a restart", () => {
    const moved = changeRegion(advance(base, ctx(now)), ctx(now), "america");
    // After the America Oct 6 day and its grace period have ended.
    const restartAt = utc("2026-10-07T11:00:00Z");
    const restarted = advance(moved, ctx(restartAt, "america"));
    // The Asia Oct 5 record is untouched, and America Oct 6 is the next recorded day.
    expect(restarted.days["2026-10-05"]).toEqual(moved.days["2026-10-05"]);
    expect(restarted.days["2026-10-06"]?.fixedAt).toBe(restartAt);
  });

  it("Asia to America during the grace period: fixes the previous day first", () => {
    const at = asiaStart("2026-10-06") + HOUR;
    const ready = advance(base, ctx(at));
    const checked = checkAll(ready, ctx(at), "2026-10-05");
    const moved = changeRegion(checked, ctx(at), "america");
    expect(moved.days["2026-10-05"]?.result).toBe("done");
    // The America Oct 5 label is already used by the Asia record, so counting resumes on Oct 6.
    expect(moved.countFrom).toBe(gameDayStart("2026-10-06", "america"));
  });

  it("America to Asia with checks today: fixes today and never overlaps labels", () => {
    const americaBase = install(gameDayStart("2026-10-01", "america"), "america");
    // 10:00 Korea time on Oct 6 is 20:00 on Oct 5 at the America server.
    const at = utc("2026-10-06T01:00:00Z");
    const ready = advance(americaBase, ctx(at, "america"));
    const withChecks = setDailyCheck(ready, ctx(at, "america"), "2026-10-05", "commissions", true);
    const moved = changeRegion(withChecks, ctx(at, "america"), "asia");
    expect(moved.days["2026-10-05"]?.result).toBe("not-done");
    // The Asia Oct 6 day already started, so counting resumes with Asia Oct 7.
    expect(moved.countFrom).toBe(asiaStart("2026-10-07"));
    const later = advance(moved, ctx(asiaStart("2026-10-09"), "asia"));
    expect(later.days["2026-10-06"]).toBeUndefined();
    expect(later.days["2026-10-07"]).toBeDefined();
  });

  it("counts the new region's current day at once when nothing is recorded yet", () => {
    const fresh = install(now);
    const moved = changeRegion(fresh, ctx(now), "america");
    expect(moved.countFrom).toBe(gameDayStart("2026-10-05", "america"));
    expect(editableDays(moved, ctx(now, "america"))).toEqual(["2026-10-05"]);
  });

  it("records the new region's current day when the game was off before the change", () => {
    const off = advance(base, ctx(now, "asia", { plays: false }));
    const moved = changeRegion(off, ctx(now, "asia", { plays: false }), "america");
    const at = ctx(now, "america");
    expect(editableDays(moved, at)).toEqual(["2026-10-05"]);
    const done = checkAll(moved, at, "2026-10-05");
    const later = advance(done, ctx(gameDayEnd("2026-10-05", "america") + GRACE_MS, "america"));
    expect(later.days["2026-10-05"]?.result).toBe("done");
  });

  it("changes nothing between regions with the same offset", () => {
    const state = setDailyCheck(advance(base, ctx(now)), ctx(now), "2026-10-06", "resin", true);
    const moved = changeRegion(state, ctx(now), "tw_hk_mo");
    expect(moved).toEqual(advance(state, ctx(now)));
    expect(editableDays(moved, ctx(now, "tw_hk_mo"))).toEqual(["2026-10-06"]);
  });
});

describe("clock changes", () => {
  const base = install(asiaStart("2026-10-01"));

  it("treats a forward jump like missed days", () => {
    const jumped = advance(base, ctx(asiaStart("2026-10-11")));
    expect(Object.keys(jumped.days)).toHaveLength(9);
  });

  it("removes records made under a wrong future clock when the clock moves back", () => {
    const real = asiaStart("2026-10-03") + HOUR;
    const correct = advance(base, ctx(real));
    const wrong = advance(correct, ctx(asiaStart("2026-11-01")));
    const back = advance(wrong, ctx(real + HOUR));
    // The result is what the correct clock alone would have recorded by then.
    expect(back.days).toEqual(advance(correct, ctx(real + HOUR)).days);
    expect(back.lastFixedLabel).toBe("2026-10-02");
    expect(editableDays(back, ctx(real + HOUR))).toContain("2026-10-03");
  });

  it("does not treat a region change to a region that is behind as a clock change", () => {
    const now = utc("2026-10-06T01:42:00Z");
    const state = setDailyCheck(advance(base, ctx(now)), ctx(now), "2026-10-06", "resin", true);
    const moved = changeRegion(state, ctx(now), "america");
    const after = advance(moved, ctx(now + 60_000, "america"));
    expect(after.days["2026-10-06"]).toEqual(moved.days["2026-10-06"]);
  });

  it("recovers from a wrong clock while the game is off without recording skipped days", () => {
    const off = { plays: false };
    const at = asiaStart("2026-10-03") + HOUR;
    const skipped = advance(base, ctx(at, "asia", off));
    const checked = checkAll(skipped, ctx(at, "asia", off), "2026-10-03");
    const wrong = advance(checked, ctx(asiaStart("2026-11-01"), "asia", off));
    const back = advance(wrong, ctx(at + HOUR, "asia", off));
    expect(back.dailyChecks["2026-10-03"]).toEqual(checked.dailyChecks["2026-10-03"]);
    expect(editableDays(back, ctx(at + HOUR))).toEqual(["2026-10-03"]);
    // The game is turned on: Oct 3 is recorded from its checks, and the skipped days stay unrecorded.
    const later = advance(back, ctx(asiaStart("2026-10-04") + GRACE_MS));
    expect(later.days).toEqual({
      "2026-10-03": { result: "done", fixedAt: asiaStart("2026-10-04") + GRACE_MS },
    });
  });

  it("moves first sightings made under a wrong future clock back", () => {
    const real = asiaStart("2026-10-03") + HOUR;
    const withNew = [...chores, { id: "pot", enabled: true }];
    const wrong = advance(base, ctx(asiaStart("2026-11-01"), "asia", { dailyChores: withNew }));
    const back = advance(wrong, ctx(real, "asia", { dailyChores: withNew }));
    expect(back.firstSeen.pot).toBe(real);
  });

  it("never removes checks when the clock moves back", () => {
    const at = asiaStart("2026-10-03") + HOUR;
    const checked = setDailyCheck(advance(base, ctx(at)), ctx(at), "2026-10-03", "resin", true);
    const wrong = advance(checked, ctx(asiaStart("2026-11-01")));
    const back = advance(wrong, ctx(at + HOUR));
    expect(back.dailyChecks["2026-10-03"]).toEqual(checked.dailyChecks["2026-10-03"]);
  });
});

describe("isAllDone", () => {
  const done = { result: "done", fixedAt: 0 } as const;
  const notDone = { result: "not-done", fixedAt: 0 } as const;
  const untracked = { result: "untracked", fixedAt: 0 } as const;

  it.each([
    [[done, done, done], true],
    [[done, undefined, untracked], true],
    [[done, notDone], false],
    [[untracked, undefined], false],
    [[], false],
  ])("%#", (records, expected) => {
    expect(isAllDone(records)).toBe(expected);
  });
});
