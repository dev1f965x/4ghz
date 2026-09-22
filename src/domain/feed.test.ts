import { describe, expect, it } from "vitest";
import { parseFeed } from "./feed";

const validEvent = {
  id: "genshin-6-0-livestream",
  game: "genshin",
  kind: "livestream",
  title: "6.0 Special Program",
  startsAt: "2026-10-02T11:00:00Z",
};

const validCode = {
  code: "GENSHINGIFT",
  game: "genshin",
  rewards: "원석 50 외",
  addedAt: "2026-09-21T00:00:00Z",
};

function feed(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    publishedAt: "2026-09-20T00:00:00Z",
    events: [validEvent],
    ...overrides,
  };
}

const validDailies = {
  genshin: [{ id: "commissions", title: "일일 의뢰" }],
  starrail: [{ id: "training", title: "일일 훈련", from: "2026-09-01" }],
  zenless: [{ id: "activity", title: "일일 활약도", until: "2026-12-31", note: "for editors" }],
};

describe("parseFeed", () => {
  it("reads a well-formed feed", () => {
    const result = parseFeed(feed());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feed.events[0]).toMatchObject({ id: validEvent.id, game: "genshin" });
    expect(result.feed.events[0].startsAt.toISOString()).toBe("2026-10-02T11:00:00.000Z");
  });

  it("keeps an absent end instant absent", () => {
    const result = parseFeed(feed());

    expect(result.ok && result.feed.events[0].endsAt).toBeUndefined();
  });

  it("refuses a schema major version it does not know", () => {
    const result = parseFeed(feed({ schemaVersion: "2.0" }));

    expect(result).toEqual({ ok: false, problem: { kind: "unsupported-schema", found: "2.0" } });
  });

  it("accepts a newer minor version of a known major", () => {
    expect(parseFeed(feed({ schemaVersion: "1.7" })).ok).toBe(true);
  });

  it.each([
    ["not an object", 42, "feed is not an object"],
    ["no schemaVersion", feed({ schemaVersion: undefined }), "schemaVersion is missing"],
    ["no events", feed({ events: undefined }), "events is missing"],
  ])("reports %s", (_name, raw, detail) => {
    expect(parseFeed(raw)).toEqual({ ok: false, problem: { kind: "malformed", detail } });
  });

  it.each([
    ["an unknown game", { game: "wuthering" }, 'events[0]: unknown game "wuthering"'],
    ["an unknown kind", { kind: "concert" }, 'events[0]: unknown kind "concert"'],
    ["a broken date", { startsAt: "2026-13-45" }, "events[0]: startsAt is not an instant"],
    [
      "an end before the start",
      { endsAt: "2026-10-01T00:00:00Z" },
      "events[0]: endsAt is before startsAt",
    ],
  ])("rejects %s", (_name, override, detail) => {
    const result = parseFeed(feed({ events: [{ ...validEvent, ...override }] }));

    expect(result).toEqual({ ok: false, problem: { kind: "malformed", detail } });
  });

  it("rejects two events sharing an id", () => {
    const result = parseFeed(feed({ events: [validEvent, validEvent] }));

    expect(result).toEqual({
      ok: false,
      problem: { kind: "malformed", detail: `events[1]: duplicate id "${validEvent.id}"` },
    });
  });

  it("ignores fields it does not know", () => {
    const result = parseFeed(
      feed({ events: [{ ...validEvent, note: "From the official notice" }] }),
    );

    expect(result.ok).toBe(true);
  });

  it("names the entry that is wrong", () => {
    const result = parseFeed(feed({ events: [validEvent, { ...validEvent, title: "" }] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toEqual({ kind: "malformed", detail: "events[1]: title is missing" });
  });

  it("reads a 1.0 feed, which has no codes, as having none", () => {
    const result = parseFeed(feed());

    expect(result.ok && result.feed.codes).toEqual([]);
  });

  it("reads codes from a 1.1 feed", () => {
    const expiring = { ...validCode, code: "LIVE", expiresAt: "2026-09-30T00:00:00Z" };
    const result = parseFeed(feed({ schemaVersion: "1.1", codes: [validCode, expiring] }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feed.codes.map((c) => c.code)).toEqual(["GENSHINGIFT", "LIVE"]);
    expect(result.feed.codes[1].expiresAt?.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("names the code that is wrong", () => {
    const result = parseFeed(
      feed({ codes: [validCode, { ...validCode, code: "B", rewards: "" }] }),
    );

    expect(result).toEqual({
      ok: false,
      problem: { kind: "malformed", detail: "codes[1]: rewards is missing" },
    });
  });

  it("rejects the same code twice for one game", () => {
    const result = parseFeed(feed({ codes: [validCode, validCode] }));

    expect(result).toEqual({
      ok: false,
      problem: { kind: "malformed", detail: `codes[1]: duplicate code "genshin:GENSHINGIFT"` },
    });
  });

  it("allows the same code for two games", () => {
    const result = parseFeed(feed({ codes: [validCode, { ...validCode, game: "zenless" }] }));

    expect(result.ok).toBe(true);
  });
});

describe("parseFeed dailies", () => {
  it("leaves the chores to the app when the feed has none", () => {
    const result = parseFeed(feed());

    expect(result.ok && result.feed.dailies).toBeUndefined();
  });

  it("reads each game's chores with the days they are due", () => {
    const result = parseFeed(feed({ schemaVersion: "1.2", dailies: validDailies }));

    if (!result.ok) throw new Error("expected a feed");
    expect(result.feed.dailies?.genshin).toEqual([{ id: "commissions", title: "일일 의뢰" }]);
    expect(result.feed.dailies?.starrail[0].from).toBe("2026-09-01");
    expect(result.feed.dailies?.zenless[0]).toEqual({
      id: "activity",
      title: "일일 활약도",
      until: "2026-12-31",
    });
  });

  it.each([
    [{ ...validDailies, zenless: undefined }, "dailies.zenless is not a list"],
    [
      { ...validDailies, genshin: [{ id: "a", title: "" }] },
      "dailies.genshin[0]: title is missing",
    ],
    [
      { ...validDailies, genshin: [{ id: "a", title: "A", from: "9월 1일" }] },
      "dailies.genshin[0]: from is not a day",
    ],
    [
      {
        ...validDailies,
        genshin: [{ id: "a", title: "A", from: "2026-09-02", until: "2026-09-01" }],
      },
      "dailies.genshin[0]: until is before from",
    ],
    [
      {
        ...validDailies,
        genshin: [
          { id: "a", title: "A" },
          { id: "a", title: "B" },
        ],
      },
      'dailies.genshin[1]: duplicate id "a"',
    ],
  ])("rejects dailies it cannot trust: %#", (dailies, detail) => {
    expect(parseFeed(feed({ dailies }))).toEqual({
      ok: false,
      problem: { kind: "malformed", detail },
    });
  });
});
