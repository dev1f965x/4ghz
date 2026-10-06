import { describe, expect, it } from "vitest";
import { dataFileSchema, strictDataFileSchema, strictSchemaFor } from "./schema";

const emptyGame = { schedule: [], codes: [], chores: [], periods: [] };
const text = (ko: string) => ({ ko });
const server = (at: string) => ({ kind: "server", at });
const instant = (at: string) => ({ kind: "instant", at });

function file(genshin: object = {}) {
  return {
    schemaVersion: 1,
    updatedAt: "2026-10-05T12:00:00+09:00",
    games: { genshin: { ...emptyGame, ...genshin }, hsr: emptyGame, zzz: emptyGame },
  };
}

const abyss = { id: "abyss", name: text("나선 비경"), cycle: "periodic", enabledByDefault: true };

function errors(value: unknown) {
  const result = strictSchemaFor(value).safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("data file schema", () => {
  it("accepts a minimal file and a retired stub", () => {
    expect(errors(file())).toEqual([]);
    expect(errors({ schemaVersion: 1, retired: true, updatedAt: "2026-10-05T12:00:00Z" })).toEqual(
      [],
    );
  });

  it("reads a retired file as retired even when it still has games", () => {
    const parsed = dataFileSchema.parse({ ...file(), retired: true });
    expect("retired" in parsed && parsed.retired).toBe(true);
  });

  it("strips unknown keys in the app and rejects them in CI", () => {
    const withExtra = { ...file(), futureField: 1 };
    expect(dataFileSchema.parse(withExtra)).not.toHaveProperty("futureField");
    expect(strictDataFileSchema.safeParse(withExtra).success).toBe(false);
  });

  it("rejects another major version and a missing game", () => {
    expect(errors({ ...file(), schemaVersion: 2 })).not.toEqual([]);
    const { zzz: _, ...games } = file().games;
    expect(errors({ ...file(), games })).not.toEqual([]);
  });

  it.each([
    ["a livestream in server time", { type: "livestream", start: server("2026-10-10T20:00") }],
    [
      "an endgame entry in instant time",
      { type: "endgame", start: instant("2026-10-16T04:00:00+08:00") },
    ],
    ["an instant without an offset", { type: "update", start: instant("2026-10-10T20:00") }],
    ["an impossible server time", { type: "event", start: server("2026-02-30T04:00") }],
    [
      "a link outside the official sites",
      { type: "event", start: server("2026-10-10T04:00"), url: "https://example.com/" },
    ],
    [
      "an http link",
      { type: "event", start: server("2026-10-10T04:00"), url: "http://genshin.hoyoverse.com/" },
    ],
    [
      "an end before the start",
      { type: "event", start: server("2026-10-10T04:00"), end: server("2026-10-09T04:00") },
    ],
  ])("rejects %s", (_, entry) => {
    expect(errors(file({ schedule: [{ id: "a", title: text("제목"), ...entry }] }))).not.toEqual(
      [],
    );
  });

  it("checks an event that mixes kinds on every server", () => {
    // 04:00 server time in America is 09:00 UTC; an instant end at 05:00 UTC is before it there.
    const entry = {
      id: "a",
      type: "event",
      title: text("이벤트"),
      start: server("2026-10-10T04:00"),
      end: instant("2026-10-10T05:00:00Z"),
    };
    expect(errors(file({ schedule: [entry] }))).toEqual([
      "games.genshin.schedule.0.end: End is not after start",
    ]);
  });

  it("reports invalid times as errors and never throws", () => {
    const abyssPeriod = (start: string, end: string) => ({
      id: "p",
      choreId: "abyss",
      start: server(start),
      end: server(end),
    });
    const cases = [
      file({ chores: [abyss], periods: [abyssPeriod("2026-02-30T04:00", "2026-03-16T04:00")] }),
      file({ chores: [abyss], periods: [abyssPeriod("2026-03-01T04:00", "2026-13-30T04:00")] }),
      file({
        schedule: [
          {
            id: "a",
            type: "update",
            title: text("업데이트"),
            start: instant("2026-10-10T20:00"),
            end: instant("2026-10-11T20:00:00+08:00"),
          },
        ],
      }),
    ];
    for (const value of cases) {
      expect(dataFileSchema.safeParse(value).success).toBe(false);
      expect(errors(value)).not.toEqual([]);
    }
  });

  it("points a type error at its field", () => {
    const monthly = { ...abyss, cycle: "monthly" };
    expect(errors(file({ chores: [monthly] }))[0]).toMatch(/^games\.genshin\.chores\.0\.cycle: /);
  });

  it("finds a period inside an earlier, longer one", () => {
    const period = (id: string, start: string, end: string) => ({
      id,
      choreId: "abyss",
      start: server(start),
      end: server(end),
    });
    expect(
      errors(
        file({
          chores: [abyss],
          periods: [
            period("a", "2026-01-01T04:00", "2026-03-01T04:00"),
            period("b", "2026-01-10T04:00", "2026-01-20T04:00"),
            period("c", "2026-02-01T04:00", "2026-02-10T04:00"),
          ],
        }),
      ),
    ).toEqual([
      "games.genshin.periods.1.start: Overlaps period a",
      "games.genshin.periods.2.start: Overlaps period a",
    ]);
  });

  it.each([
    "https://hoyoverse.com:8443/x",
    "https://user:pw@hoyolab.com/",
    "https:hoyoverse.com",
    "HTTPS://hoyoverse.com/",
    "https://hoyoverse.com@evil.com/",
    "https://evil-hoyoverse.com/",
  ])("rejects the link %s", (url) => {
    const entry = {
      id: "a",
      type: "event",
      title: text("이벤트"),
      start: server("2026-10-10T04:00"),
      url,
    };
    expect(errors(file({ schedule: [entry] }))).not.toEqual([]);
  });

  it("tells how to write a link in canonical form", () => {
    const entry = {
      id: "a",
      type: "event",
      title: text("이벤트"),
      start: server("2026-10-10T04:00"),
      url: "https://GENSHIN.hoyoverse.com",
    };
    expect(errors(file({ schedule: [entry] }))).toEqual([
      "games.genshin.schedule.0.url: Write the link as https://genshin.hoyoverse.com/",
    ]);
  });

  it("checks a file with retired: false as a full file", () => {
    expect(errors({ ...file(), retired: false })).toEqual([': Unrecognized key: "retired"']);
  });

  it("accepts estimated entries and only the value true", () => {
    const entry = (estimated: unknown) => ({
      id: "a",
      type: "livestream",
      title: text("방송"),
      start: instant("2026-10-24T20:00:00+08:00"),
      estimated,
    });
    expect(errors(file({ schedule: [entry(true)] }))).toEqual([]);
    expect(errors(file({ schedule: [entry(false)] }))).not.toEqual([]);
  });

  it("accepts official links on subdomains", () => {
    const entry = {
      id: "a",
      type: "event",
      title: text("이벤트"),
      start: server("2026-10-10T04:00"),
      url: "https://www.hoyolab.com/article/1",
    };
    expect(errors(file({ schedule: [entry] }))).toEqual([]);
  });

  it("rejects duplicate ids and codes that differ only in case", () => {
    const code = { rewards: text("원석 60"), addedAt: "2026-10-05T12:00:00+09:00" };
    expect(
      errors(
        file({
          chores: [abyss, abyss],
          codes: [
            { code: "ABC", ...code },
            { code: "abc", ...code },
          ],
        }),
      ),
    ).toEqual(["games.genshin.codes.1: Duplicate abc", "games.genshin.chores.1: Duplicate abyss"]);
  });

  it("checks periods: periodic chore, order, and overlap", () => {
    const period = (id: string, start: string, end: string, choreId = "abyss") => ({
      id,
      choreId,
      start: server(start),
      end: server(end),
    });
    const daily = { id: "resin", name: text("레진"), cycle: "daily", enabledByDefault: true };
    expect(
      errors(
        file({
          chores: [abyss, daily],
          periods: [
            period("p1", "2026-09-16T04:00", "2026-10-16T04:00"),
            // Starting exactly at the previous end is allowed: intervals are half-open.
            period("p2", "2026-10-16T04:00", "2026-11-16T04:00"),
            period("p3", "2026-11-01T04:00", "2026-12-16T04:00"),
            period("p4", "2026-10-01T04:00", "2026-10-02T04:00", "resin"),
          ],
        }),
      ),
    ).toEqual([
      "games.genshin.periods.3.choreId: resin is not a periodic chore",
      "games.genshin.periods.2.start: Overlaps period p2",
    ]);
  });
});

describe("published data files", () => {
  // Every major version the Pages workflow publishes; the JSON Schema files are not data.
  const files = Object.entries(
    import.meta.glob<unknown>("/data/v*.json", { eager: true, import: "default" }),
  ).filter(([path]) => /\/v\d+\.json$/.test(path));

  it("include v1", () => {
    expect(files.map(([path]) => path)).toContain("/data/v1.json");
  });

  it.each(files)("%s passes the strict schema", (_, content) => {
    expect(errors(content)).toEqual([]);
  });
});

describe("e2e test data", () => {
  // The frozen copy the end-to-end tests serve must stay valid as the schema changes.
  const fixtures = Object.entries(
    import.meta.glob<unknown>("/e2e/fixtures/*.json", { eager: true, import: "default" }),
  );

  it.each(fixtures)("%s passes the strict schema", (_, content) => {
    expect(errors(content)).toEqual([]);
  });
});
