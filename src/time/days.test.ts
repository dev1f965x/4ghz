import { describe, expect, it } from "vitest";
import { gameDayStart, type Region } from "./clock";
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

  it("starts tracking a game whose chores load after installation as soon as they arrive", () => {
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

  it("keeps the gap after a restart", () => {
    const moved = changeRegion(advance(base, ctx(now)), ctx(now), "america");
    const restarted = advance(moved, ctx(now + 3 * HOUR, "america"));
    // The America Oct 5 day ended inside the gap and is never recorded.
    expect(restarted.days["2026-10-05"]?.fixedAt).toBe(moved.days["2026-10-05"]?.fixedAt);
    expect(Object.keys(restarted.days).filter((l) => l > "2026-10-05")).toEqual([]);
  });

  it("America to Asia: fixes the grace day first and never overlaps labels", () => {
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
