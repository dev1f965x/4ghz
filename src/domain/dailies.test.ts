import { describe, expect, it } from "vitest";
import {
  addDays,
  CHORES as CHORES_OF,
  type DailyRecords,
  EMPTY_RECORDS,
  gameDay,
  isComplete,
  isPerfectDay,
  monthGrid,
  streak,
  toggleChore,
  toggleGame,
} from "./dailies";

function finished(days: string[]): DailyRecords {
  return days.reduce(
    (records, day) =>
      toggleChore(toggleChore(records, day, "genshin", "commissions"), day, "genshin", "resin"),
    EMPTY_RECORDS,
  );
}

describe("gameDay", () => {
  it("rolls over at 05:00 in Korea, which is 04:00 on the Asia server", () => {
    expect(gameDay(new Date("2026-09-21T04:59:00+09:00"))).toBe("2026-09-20");
    expect(gameDay(new Date("2026-09-21T05:00:00+09:00"))).toBe("2026-09-21");
  });

  it("does not care which zone the computer is set to", () => {
    const sameInstant = new Date("2026-09-21T20:30:00Z");

    expect(gameDay(sameInstant)).toBe("2026-09-22");
  });
});

describe("chores", () => {
  it("counts a game as done only when every chore is", () => {
    const half = toggleChore(EMPTY_RECORDS, "2026-09-21", "genshin", "commissions");

    expect(isComplete(half, "2026-09-21", "genshin")).toBe(false);
    expect(
      isComplete(toggleChore(half, "2026-09-21", "genshin", "resin"), "2026-09-21", "genshin"),
    ).toBe(true);
  });

  it("unchecks a chore checked by mistake", () => {
    const once = toggleChore(EMPTY_RECORDS, "2026-09-21", "zenless", "battery");

    expect(
      toggleChore(once, "2026-09-21", "zenless", "battery").done["2026-09-21"]?.zenless,
    ).toEqual([]);
  });
});

describe("streak", () => {
  it("counts finished days back from today", () => {
    const records = finished(["2026-09-19", "2026-09-20", "2026-09-21"]);

    expect(streak(records, "genshin", "2026-09-21")).toBe(3);
  });

  it("keeps yesterday's run while today is still open", () => {
    const records = finished(["2026-09-19", "2026-09-20"]);

    expect(streak(records, "genshin", "2026-09-21")).toBe(2);
  });

  it("stops at the first day left unfinished", () => {
    const records = finished(["2026-09-17", "2026-09-19", "2026-09-20"]);

    expect(streak(records, "genshin", "2026-09-20")).toBe(2);
  });

  it("is zero when yesterday was missed", () => {
    const records = finished(["2026-09-18"]);

    expect(streak(records, "genshin", "2026-09-21")).toBe(0);
  });
});

describe("games", () => {
  it("keeps the picked games in a fixed order", () => {
    const none = { ...EMPTY_RECORDS, games: [] };
    const picked = toggleGame(toggleGame(none, "zenless"), "genshin");

    expect(picked.games).toEqual(["genshin", "zenless"]);
    expect(toggleGame(picked, "genshin").games).toEqual(["zenless"]);
  });
});

describe("monthGrid", () => {
  it("lays September 2026 out from Sunday, starting on a Tuesday", () => {
    const weeks = monthGrid(2026, 9);

    expect(weeks[0]).toEqual([
      null,
      null,
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isPerfectDay", () => {
  const day = "2026-09-21";
  const all = (["genshin", "starrail", "zenless"] as const).reduce(
    (records, game) =>
      CHORES_OF[game].reduce((r, chore) => toggleChore(r, day, game, chore), records),
    EMPTY_RECORDS,
  );

  it("needs every game in view finished", () => {
    expect(isPerfectDay(all, day, ["genshin", "starrail", "zenless"])).toBe(true);
    expect(
      isPerfectDay(toggleChore(all, day, "zenless", "battery"), day, ["genshin", "zenless"]),
    ).toBe(false);
  });

  it("takes only the one game when one is in view", () => {
    expect(isPerfectDay(all, day, ["genshin"])).toBe(true);
  });

  it("needs something in view", () => {
    expect(isPerfectDay(all, day, [])).toBe(false);
  });
});
