import { codeKey, type RedeemCode } from "./code";
import type { Chore, Chores } from "./dailies";
import { EVENT_KINDS, type EventKind, GAMES, type Game, type GameEvent } from "./event";

/** Feed layouts this build understands. A newer major version means the app is too old. */
export const SUPPORTED_SCHEMA_MAJOR = 1;

export interface Feed {
  schemaVersion: string;
  publishedAt: Date;
  events: GameEvent[];
  /** Added in schema 1.1; a 1.0 feed has none. */
  codes: RedeemCode[];
  /** Added in schema 1.2; an older feed leaves the app with the chores it was built with. */
  dailies?: Chores;
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
 *
 * Unknown fields are ignored on purpose. The feed carries editor-only keys such as
 * `note`, and a future minor version may add more that this build should survive.
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
  const seenIds = new Set<string>();
  for (const [index, entry] of raw.events.entries()) {
    const event = parseEvent(entry);
    if (!event.ok) return malformed(`events[${index}]: ${event.detail}`);
    if (seenIds.has(event.event.id)) {
      return malformed(`events[${index}]: duplicate id "${event.event.id}"`);
    }
    seenIds.add(event.event.id);
    events.push(event.event);
  }

  const codes = parseCodes(raw.codes);
  if (!codes.ok) return malformed(codes.detail);

  const dailies = parseDailies(raw.dailies);
  if (!dailies.ok) return malformed(dailies.detail);

  return {
    ok: true,
    feed: { schemaVersion, publishedAt, events, codes: codes.codes, dailies: dailies.dailies },
  };
}

type DailiesResult = { ok: true; dailies?: Chores } | { ok: false; detail: string };

/** A list of chores for every game, ids unique within a game. Absent is fine; partial is not. */
export function parseDailies(raw: unknown): DailiesResult {
  if (raw === undefined) return { ok: true };
  if (!isRecord(raw)) return { ok: false, detail: "dailies is not an object" };

  const dailies: Partial<Record<Game, Chore[]>> = {};
  for (const game of GAMES) {
    const list = raw[game];
    if (!Array.isArray(list)) return { ok: false, detail: `dailies.${game} is not a list` };

    const chores: Chore[] = [];
    const seen = new Set<string>();
    for (const [index, entry] of list.entries()) {
      const chore = parseChore(entry);
      const where = `dailies.${game}[${index}]`;
      if (!chore.ok) return { ok: false, detail: `${where}: ${chore.detail}` };
      if (seen.has(chore.chore.id)) {
        return { ok: false, detail: `${where}: duplicate id "${chore.chore.id}"` };
      }
      seen.add(chore.chore.id);
      chores.push(chore.chore);
    }
    dailies[game] = chores;
  }
  return { ok: true, dailies: dailies as Chores };
}

type ChoreResult = { ok: true; chore: Chore } | { ok: false; detail: string };

const GAME_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseChore(raw: unknown): ChoreResult {
  if (!isRecord(raw)) return { ok: false, detail: "not an object" };

  const { id, title, from, until } = raw;
  if (typeof id !== "string" || id === "") return { ok: false, detail: "id is missing" };
  if (typeof title !== "string" || title === "") return { ok: false, detail: "title is missing" };
  if (from !== undefined && !isGameDay(from)) return { ok: false, detail: "from is not a day" };
  if (until !== undefined && !isGameDay(until)) return { ok: false, detail: "until is not a day" };
  if (from !== undefined && until !== undefined && until < from) {
    return { ok: false, detail: "until is before from" };
  }

  return { ok: true, chore: { id, title, from, until } };
}

function isGameDay(raw: unknown): raw is string {
  return typeof raw === "string" && GAME_DAY.test(raw);
}

type CodesResult = { ok: true; codes: RedeemCode[] } | { ok: false; detail: string };

function parseCodes(raw: unknown): CodesResult {
  if (raw === undefined) return { ok: true, codes: [] };
  if (!Array.isArray(raw)) return { ok: false, detail: "codes is not a list" };

  const codes: RedeemCode[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.entries()) {
    const code = parseCode(entry);
    if (!code.ok) return { ok: false, detail: `codes[${index}]: ${code.detail}` };

    const key = codeKey(code.code);
    if (seen.has(key)) return { ok: false, detail: `codes[${index}]: duplicate code "${key}"` };
    seen.add(key);
    codes.push(code.code);
  }
  return { ok: true, codes };
}

type CodeResult = { ok: true; code: RedeemCode } | { ok: false; detail: string };

function parseCode(raw: unknown): CodeResult {
  if (!isRecord(raw)) return { ok: false, detail: "not an object" };

  const { code, game, rewards } = raw;
  if (typeof code !== "string" || code === "") return { ok: false, detail: "code is missing" };
  if (!isGame(game)) return { ok: false, detail: `unknown game "${String(game)}"` };
  if (typeof rewards !== "string" || rewards === "") {
    return { ok: false, detail: "rewards is missing" };
  }

  const addedAt = parseInstant(raw.addedAt);
  if (!addedAt) return { ok: false, detail: "addedAt is not an instant" };

  const expiresAt = raw.expiresAt === undefined ? undefined : parseInstant(raw.expiresAt);
  if (raw.expiresAt !== undefined && !expiresAt) {
    return { ok: false, detail: "expiresAt is not an instant" };
  }

  return { ok: true, code: { code, game, rewards, addedAt, expiresAt } };
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
