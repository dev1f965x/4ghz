import { GAMES, type Game } from "./event";

/** Which game the window is looking at, or all of them. */
export type GameFilter = Game | "all";

export const GAME_FILTERS: readonly GameFilter[] = ["all", ...GAMES];

export function matchesFilter(game: Game, filter: GameFilter): boolean {
  return filter === "all" || game === filter;
}

export function isGameFilter(value: unknown): value is GameFilter {
  return typeof value === "string" && (GAME_FILTERS as readonly string[]).includes(value);
}
