/** A game covered by the app. The feed uses these keys. */
export const GAMES = ["genshin", "starrail", "zenless"] as const;
export type Game = (typeof GAMES)[number];

/** What kind of announcement an event is. */
export const EVENT_KINDS = ["livestream", "version", "maintenance", "ingame"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/**
 * One announced event, with instants already parsed.
 *
 * `endsAt` is absent for announcements that happen at a single moment, such as a
 * livestream going live.
 */
export interface GameEvent {
  id: string;
  game: Game;
  kind: EventKind;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  url?: string;
}
