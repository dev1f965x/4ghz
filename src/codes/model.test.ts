import { describe, expect, it } from "vitest";
import { officialHosts } from "@/data/official-hosts";
import { activeCodes, redemptionUrl } from "./model";

const NOW = Date.parse("2026-10-06T01:42:00Z");
const rewards = { ko: "원석 60" };

const game = {
  schedule: [],
  chores: [],
  periods: [],
  codes: [
    { code: "OLD", rewards, addedAt: "2026-09-01T00:00:00+09:00" },
    { code: "NEW", rewards, addedAt: "2026-10-05T00:00:00+09:00" },
    {
      code: "EXPIRED",
      rewards,
      addedAt: "2026-10-06T00:00:00+09:00",
      expires: { kind: "instant" as const, at: "2026-10-06T09:00:00+08:00" },
    },
    {
      code: "SERVERTIME",
      rewards,
      addedAt: "2026-10-04T00:00:00+09:00",
      // 04:00 on Oct 6: already past in Asia (20:00 UTC Oct 5), still ahead in America (09:00 UTC).
      expires: { kind: "server" as const, at: "2026-10-06T04:00" },
    },
  ],
};

describe("activeCodes", () => {
  it("hides expired codes, keeps codes without an expiry, and lists the newest first", () => {
    expect(activeCodes(game, "asia", NOW).map((c) => c.code)).toEqual(["NEW", "OLD"]);
  });

  it("resolves a server-time expiry on the user's server", () => {
    const america = activeCodes(game, "america", NOW);
    expect(america.map((c) => c.code)).toEqual(["NEW", "SERVERTIME", "OLD"]);
    expect(america[1].expires).toBe(Date.parse("2026-10-06T09:00:00Z"));
  });

  it("hides a code exactly at its expiry", () => {
    const expiry = Date.parse("2026-10-06T01:00:00Z");
    expect(activeCodes(game, "asia", expiry - 1).map((c) => c.code)).toContain("EXPIRED");
    expect(activeCodes(game, "asia", expiry).map((c) => c.code)).not.toContain("EXPIRED");
  });
});

describe("redemptionUrl", () => {
  it.each(["genshin", "hsr", "zzz"] as const)("points %s to an official host", (game) => {
    for (const language of ["ko", "en"]) {
      expect(officialHosts).toContain(new URL(redemptionUrl(game, language)).hostname);
    }
  });
});
