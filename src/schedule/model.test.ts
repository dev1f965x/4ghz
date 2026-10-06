import { describe, expect, it } from "vitest";
import { localText, scheduleRows } from "./model";

const NOW = Date.parse("2026-10-06T01:42:00Z");
const text = (ko: string) => ({ ko });
const instant = (at: string) => ({ kind: "instant" as const, at });
const server = (at: string) => ({ kind: "server" as const, at });

const game = {
  schedule: [
    {
      id: "past",
      type: "event" as const,
      title: text("끝남"),
      start: server("2026-09-01T10:00"),
      end: server("2026-10-01T04:00"),
    },
    {
      id: "event",
      type: "event" as const,
      title: text("이벤트"),
      start: server("2026-09-24T10:00"),
      end: server("2026-10-12T04:00"),
    },
    {
      id: "live",
      type: "livestream" as const,
      title: text("방송"),
      start: instant("2026-10-24T20:00:00+08:00"),
      estimated: true as const,
    },
    {
      id: "update",
      type: "update" as const,
      title: text("업데이트"),
      start: instant("2026-11-04T06:00:00+08:00"),
      end: instant("2026-11-04T11:00:00+08:00"),
      url: "https://genshin.hoyoverse.com/",
    },
  ],
  codes: [],
  chores: [
    { id: "abyss", name: text("나선 비경"), cycle: "periodic" as const, enabledByDefault: true },
  ],
  periods: [
    {
      id: "a1",
      choreId: "abyss",
      start: server("2026-09-16T04:00"),
      end: server("2026-10-16T04:00"),
    },
    {
      id: "a2",
      choreId: "abyss",
      start: server("2026-10-16T04:00"),
      end: server("2026-11-16T04:00"),
    },
  ],
};

describe("scheduleRows", () => {
  it("splits ongoing and upcoming, drops ended entries, and adds endgame periods", () => {
    const { ongoing, upcoming } = scheduleRows(game, "asia", NOW);
    // Ongoing by soonest end, upcoming by soonest start.
    expect(ongoing.map((r) => r.id)).toEqual(["event", "period-a1"]);
    expect(upcoming.map((r) => r.id)).toEqual(["period-a2", "live", "update"]);
    expect(ongoing[1]).toMatchObject({ type: "endgame", title: { ko: "나선 비경" } });
    expect(upcoming.find((r) => r.id === "live")).toMatchObject({ estimated: true, end: null });
  });

  it("resolves server times on the user's server", () => {
    const asia = scheduleRows(game, "asia", NOW).ongoing.find((r) => r.id === "event");
    const america = scheduleRows(game, "america", NOW).ongoing.find((r) => r.id === "event");
    // 04:00 on Oct 12: 20:00 UTC on Oct 11 in Asia, 09:00 UTC on Oct 12 in America.
    expect(asia?.end).toBe(Date.parse("2026-10-11T20:00:00Z"));
    expect(america?.end).toBe(Date.parse("2026-10-12T09:00:00Z"));
  });

  it("removes an entry exactly at its end, and one without an end 3 hours after its start", () => {
    const eventEnd = Date.parse("2026-10-11T20:00:00Z");
    expect(scheduleRows(game, "asia", eventEnd - 1).ongoing.map((r) => r.id)).toContain("event");
    expect(scheduleRows(game, "asia", eventEnd).ongoing.map((r) => r.id)).not.toContain("event");
    const liveStart = Date.parse("2026-10-24T12:00:00Z");
    const during = scheduleRows(game, "asia", liveStart + 2 * 3_600_000);
    expect(during.ongoing.map((r) => r.id)).toContain("live");
    const after = scheduleRows(game, "asia", liveStart + 3 * 3_600_000);
    expect([...after.ongoing, ...after.upcoming].map((r) => r.id)).not.toContain("live");
  });

  it("returns nothing when every entry has ended", () => {
    const late = Date.parse("2027-01-01T00:00:00Z");
    expect(scheduleRows(game, "asia", late)).toEqual({ ongoing: [], upcoming: [] });
  });
});

describe("localText", () => {
  it("uses English when written, Korean otherwise", () => {
    expect(localText({ ko: "방송", en: "Livestream" }, "en")).toBe("Livestream");
    expect(localText({ ko: "방송" }, "en")).toBe("방송");
    expect(localText({ ko: "방송", en: "Livestream" }, "ko")).toBe("방송");
  });
});
