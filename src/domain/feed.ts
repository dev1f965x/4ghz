import { EVENT_KINDS, type EventKind, GAMES, type Game, type GameEvent } from "./event";

/** Feed layouts this build understands. A newer major version means the app is too old. */
export const SUPPORTED_SCHEMA_MAJOR = 1;

export interface Feed {
  schemaVersion: string;
  publishedAt: Date;
  events: GameEvent[];
}

export type FeedProblem =
  | { readonly kind: "malformed"; readonly detail: string }
  | { readonly kind: "unsupported-schema"; readonly found: string };

export type FeedResult =
  | { readonly ok: true; readonly feed: Feed }
  | { readonly ok: false; readonly problem: FeedProblem };

/**
 * Turns whatever the feed URL returned into events, or into a problem to show.
 *
 * Parsing never throws: a feed edited by hand is the most likely thing to be wrong, and
 * the window has to say what is wrong instead of disappearing.
 */
export function parseFeed(raw: unknown): FeedResult {
  if (!isRecord(raw)) return malformed("feed is not an object");

  const schemaVersion = raw.schemaVersion;
  if (typeof schemaVersion !== "string") return malformed("schemaVersion is missing");

  const major = Number.parseInt(schemaVersion.split(".")[0] ?? "", 10);
  if (Number.isNaN(major)) return malformed(`schemaVersion "${schemaVersion}" is not a version`);
  if (major > SUPPORTED_SCHEMA_MAJOR) {
    return { ok: false, problem: { kind: "unsupported-schema", found: schemaVersion } };
  }

  const publishedAt = parseInstant(raw.publishedAt);
  if (!publishedAt) return malformed("publishedAt is not an instant");

  if (!Array.isArray(raw.events)) return malformed("events is missing");

  const events: GameEvent[] = [];
  for (const [index, entry] of raw.events.entries()) {
    const event = parseEvent(entry);
    if (!event.ok) return malformed(`events[${index}]: ${event.detail}`);
    events.push(event.event);
  }

  return { ok: true, feed: { schemaVersion, publishedAt, events } };
}

type EventResult = { ok: true; event: GameEvent } | { ok: false; detail: string };

function parseEvent(raw: unknown): EventResult {
  if (!isRecord(raw)) return { ok: false, detail: "not an object" };

  const { id, game, kind, title, url } = raw;
  if (typeof id !== "string" || id === "") return { ok: false, detail: "id is missing" };
  if (!isGame(game)) return { ok: false, detail: `unknown game "${String(game)}"` };
  if (!isEventKind(kind)) return { ok: false, detail: `unknown kind "${String(kind)}"` };
  if (typeof title !== "string" || title === "") return { ok: false, detail: "title is missing" };

  const startsAt = parseInstant(raw.startsAt);
  if (!startsAt) return { ok: false, detail: "startsAt is not an instant" };

  const endsAt = raw.endsAt === undefined ? undefined : parseInstant(raw.endsAt);
  if (raw.endsAt !== undefined && !endsAt) return { ok: false, detail: "endsAt is not an instant" };
  if (endsAt && endsAt.getTime() < startsAt.getTime()) {
    return { ok: false, detail: "endsAt is before startsAt" };
  }
  if (url !== undefined && typeof url !== "string")
    return { ok: false, detail: "url is not a string" };

  return { ok: true, event: { id, game, kind, title, startsAt, endsAt, url } };
}

function parseInstant(raw: unknown): Date | undefined {
  if (typeof raw !== "string") return undefined;
  const instant = new Date(raw);
  return Number.isNaN(instant.getTime()) ? undefined : instant;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function isGame(raw: unknown): raw is Game {
  return typeof raw === "string" && (GAMES as readonly string[]).includes(raw);
}

function isEventKind(raw: unknown): raw is EventKind {
  return typeof raw === "string" && (EVENT_KINDS as readonly string[]).includes(raw);
}

function malformed(detail: string): FeedResult {
  return { ok: false, problem: { kind: "malformed", detail } };
}
