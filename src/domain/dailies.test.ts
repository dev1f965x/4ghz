import { describe, expect, it } from "vitest";
import {
  addDays,
  type Chores,
  choresOn,
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

const CHORES: Chores = {
  genshin: [
    { id: "commissions", title: "일일 의뢰" },
    { id: "resin", title: "레진 소모" },
  ],
  starrail: [
    { id: "training", title: "일일 훈련" },
    { id: "power", title: "개척력 소모" },
  ],
  zenless: [
    { id: "activity", title: "일일 활약도" },
    { id: "battery", title: "배터리 소모" },
  ],
};

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

    expect(isComplete(half, CHORES, "2026-09-21", "genshin")).toBe(false);
    expect(
      isComplete(
        toggleChore(half, "2026-09-21", "genshin", "resin"),
        CHORES,
        "2026-09-21",
        "genshin",
      ),
    ).toBe(true);
  });

  it("unchecks a chore checked by mistake", () => {
    const once = toggleChore(EMPTY_RECORDS, "2026-09-21", "zenless", "battery");

    expect(
      toggleChore(once, "2026-09-21", "zenless", "battery").done["2026-09-21"]?.zenless,
    ).toEqual([]);
  });
});

describe("chores over time", () => {
  const added: Chores = {
    ...CHORES,
    genshin: [...CHORES.genshin, { id: "realm", title: "선율의 조각", from: "2026-09-21" }],
  };
  const retired: Chores = {
    ...CHORES,
    genshin: [CHORES.genshin[0], { ...CHORES.genshin[1], until: "2026-09-20" }],
  };

  it("lists a chore only on the days it is due", () => {
    expect(choresOn(added, "genshin", "2026-09-20").map((chore) => chore.id)).toEqual([
      "commissions",
      "resin",
    ]);
    expect(choresOn(retired, "genshin", "2026-09-21").map((chore) => chore.id)).toEqual([
      "commissions",
    ]);
  });

  it("does not undo a finished day when a chore is added after it", () => {
    const records = finished(["2026-09-20"]);

    expect(isComplete(records, added, "2026-09-20", "genshin")).toBe(true);
    expect(isComplete(finished(["2026-09-21"]), added, "2026-09-21", "genshin")).toBe(false);
  });

  it("keeps a streak going across a chore's retirement", () => {
    const records = toggleChore(
      finished(["2026-09-19", "2026-09-20"]),
      "2026-09-21",
      "genshin",
      "commissions",
    );

    expect(streak(records, retired, "genshin", "2026-09-21")).toBe(3);
  });

  it("does not count a day with nothing due as finished", () => {
    const none: Chores = { ...CHORES, genshin: [] };

    expect(isComplete(EMPTY_RECORDS, none, "2026-09-21", "genshin")).toBe(false);
  });
});

describe("streak", () => {
  it("counts finished days back from today", () => {
    const records = finished(["2026-09-19", "2026-09-20", "2026-09-21"]);

    expect(streak(records, CHORES, "genshin", "2026-09-21")).toBe(3);
  });

  it("keeps yesterday's run while today is still open", () => {
    const records = finished(["2026-09-19", "2026-09-20"]);

    expect(streak(records, CHORES, "genshin", "2026-09-21")).toBe(2);
  });

  it("stops at the first day left unfinished", () => {
    const records = finished(["2026-09-17", "2026-09-19", "2026-09-20"]);

    expect(streak(records, CHORES, "genshin", "2026-09-20")).toBe(2);
  });

  it("is zero when yesterday was missed", () => {
    const records = finished(["2026-09-18"]);

    expect(streak(records, CHORES, "genshin", "2026-09-21")).toBe(0);
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
      CHORES[game].reduce((r, chore) => toggleChore(r, day, game, chore.id), records),
    EMPTY_RECORDS,
  );

  it("needs every game in view finished", () => {
    expect(isPerfectDay(all, CHORES, day, ["genshin", "starrail", "zenless"])).toBe(true);
    expect(
      isPerfectDay(toggleChore(all, day, "zenless", "battery"), CHORES, day, [
        "genshin",
        "zenless",
      ]),
    ).toBe(false);
  });

  it("takes only the one game when one is in view", () => {
    expect(isPerfectDay(all, CHORES, day, ["genshin"])).toBe(true);
  });

  it("needs something in view", () => {
    expect(isPerfectDay(all, CHORES, day, [])).toBe(false);
  });
});
