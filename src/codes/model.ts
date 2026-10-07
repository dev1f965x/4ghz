// The Codes tab's rows for one game: codes that have not expired on the
// user's server, newest first. A code without a known expiry stays until the owner removes it.
import type { DataFile } from "@/data/classify";
import { type Region, toInstant } from "@/time/clock";

type GameData = DataFile["games"]["genshin"];

export type CodeRow = {
  code: string;
  rewards: { ko: string; en?: string };
  /** null when the expiry is unknown. */
  expires: number | null;
};

export function activeCodes(game: GameData, region: Region, now: number): CodeRow[] {
  return game.codes
    .map((c) => ({
      code: c.code,
      rewards: c.rewards,
      expires: c.expires ? toInstant(c.expires, region) : null,
      added: Date.parse(c.addedAt),
    }))
    .filter((c) => c.expires === null || now < c.expires)
    .sort((a, b) => b.added - a.added)
    .map(({ added: _, ...row }) => row);
}

// The official redemption page per game; every host is in official-hosts.ts.
export function redemptionUrl(game: "genshin" | "hsr" | "zzz", language: string) {
  switch (game) {
    case "genshin":
      return `https://genshin.hoyoverse.com/${language === "ko" ? "ko" : "en"}/gift`;
    case "hsr":
      return "https://hsr.hoyoverse.com/gift";
    case "zzz":
      return "https://zenless.hoyoverse.com/redemption";
  }
}
