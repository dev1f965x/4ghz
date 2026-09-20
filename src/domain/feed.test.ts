import { describe, expect, it } from "vitest";
import { parseFeed } from "./feed";

const validEvent = {
  id: "genshin-6-0-livestream",
  game: "genshin",
  kind: "livestream",
  title: "6.0 특별 방송",
  startsAt: "2026-10-02T11:00:00Z",
};

function feed(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    publishedAt: "2026-09-20T00:00:00Z",
    events: [validEvent],
    ...overrides,
  };
}

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

  it("names the entry that is wrong", () => {
    const result = parseFeed(feed({ events: [validEvent, { ...validEvent, title: "" }] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toEqual({ kind: "malformed", detail: "events[1]: title is missing" });
  });
});
