import type { Game } from "./event";

/** A promotional code HoYoverse hands out, good once per account until it expires. */
export interface RedeemCode {
  code: string;
  game: Game;
  /** Shown as written, in Korean. */
  rewards: string;
  addedAt: Date;
  expiresAt?: Date;
}

/** One code across games: the same string may be published for two games. */
export function codeKey(code: RedeemCode): string {
  return `${code.game}:${code.code}`;
}

/**
 * The codes worth showing at `now`: expired ones dropped, the newest first, and those
 * already used sunk below the rest so the list starts with what is left to do.
 */
export function codesToShow(
  codes: readonly RedeemCode[],
  used: ReadonlySet<string>,
  now: Date,
): RedeemCode[] {
  const live = codes.filter((code) => !code.expiresAt || code.expiresAt.getTime() > now.getTime());
  const newestFirst = [...live].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());

  return [
    ...newestFirst.filter((code) => !used.has(codeKey(code))),
    ...newestFirst.filter((code) => used.has(codeKey(code))),
  ];
}

const REDEMPTION_PAGES: Record<Game, string> = {
  genshin: "https://genshin.hoyoverse.com/ko/gift",
  starrail: "https://hsr.hoyoverse.com/gift",
  zenless: "https://zenless.hoyoverse.com/redemption",
};

/** The game's official redemption page, with the code in the query for pages that read it. */
export function redemptionUrl(code: RedeemCode): string {
  return `${REDEMPTION_PAGES[code.game]}?code=${encodeURIComponent(code.code)}`;
}
