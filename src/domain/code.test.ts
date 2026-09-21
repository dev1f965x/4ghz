import { describe, expect, it } from "vitest";
import { codeKey, codesToShow, type RedeemCode, redemptionUrl } from "./code";

const now = new Date("2026-09-21T12:00:00Z");

function code(overrides: Partial<RedeemCode> = {}): RedeemCode {
  return {
    code: "GENSHINGIFT",
    game: "genshin",
    rewards: "원석 50 외",
    addedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

describe("codesToShow", () => {
  it("drops codes past their expiry and keeps those with none", () => {
    const expired = code({ code: "OLD", expiresAt: new Date("2026-09-20T00:00:00Z") });
    const live = code({ code: "LIVE", expiresAt: new Date("2026-09-30T00:00:00Z") });
    const forever = code({ code: "FOREVER" });

    expect(codesToShow([expired, live, forever], new Set(), now).map((c) => c.code)).toEqual([
      "LIVE",
      "FOREVER",
    ]);
  });

  it("puts the newest first", () => {
    const older = code({ code: "OLDER", addedAt: new Date("2026-09-01T00:00:00Z") });
    const newer = code({ code: "NEWER", addedAt: new Date("2026-09-20T00:00:00Z") });

    expect(codesToShow([older, newer], new Set(), now).map((c) => c.code)).toEqual([
      "NEWER",
      "OLDER",
    ]);
  });

  it("sinks used codes below the rest", () => {
    const used = code({ code: "USED", addedAt: new Date("2026-09-20T00:00:00Z") });
    const fresh = code({ code: "FRESH", addedAt: new Date("2026-09-01T00:00:00Z") });

    expect(codesToShow([used, fresh], new Set([codeKey(used)]), now).map((c) => c.code)).toEqual([
      "FRESH",
      "USED",
    ]);
  });

  it("tells the same code apart across games", () => {
    expect(codeKey(code({ game: "genshin" }))).not.toBe(codeKey(code({ game: "zenless" })));
  });
});

describe("redemptionUrl", () => {
  it("points each game at its own official page", () => {
    expect(redemptionUrl(code({ game: "genshin", code: "A1" }))).toBe(
      "https://genshin.hoyoverse.com/ko/gift?code=A1",
    );
    expect(redemptionUrl(code({ game: "starrail", code: "B2" }))).toBe(
      "https://hsr.hoyoverse.com/gift?code=B2",
    );
    expect(redemptionUrl(code({ game: "zenless", code: "C3" }))).toBe(
      "https://zenless.hoyoverse.com/redemption?code=C3",
    );
  });
});
