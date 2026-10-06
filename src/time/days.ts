// Records game-day results for one game, following the Design Doc's "Time and reset logic".
// Pure functions: callers pass the current instant and store the returned state.
import { addDays, DAY, gameDayEnd, gameDayLabel, gameDayStart, type Region } from "./clock";

// The previous game day stays editable for this long after the daily reset.
export const GRACE_MS = 2 * 60 * 60 * 1000;
// A clock that moved back by more than this is treated as wrong (Design Doc, Clock changes).
const CLOCK_TOLERANCE_MS = 60 * 1000;
// Checks of a recorded day are kept this long after the day was fixed.
const CHECK_RETENTION_MS = 7 * DAY;

export type DayResult = "done" | "not-done" | "untracked";
export type DayRecord = { result: DayResult; fixedAt: number };

type DailyChore = { id: string; enabled: boolean };

/** Everything the app stores for one game's day history. */
export type GameDays = {
  initialized: boolean;
  /** Instant from which a chore counts; 0 means it counts in every cycle. */
  firstSeen: Record<string, number>;
  /** Start of the first game day that is recorded. */
  countFrom: number | null;
  /** Highest game-day label already processed, whether recorded or skipped. */
  lastFixedLabel: string | null;
  /** Latest instant the state was brought up to; detects a clock that moved back. */
  lastAdvancedAt: number;
  days: Record<string, DayRecord>;
  /** Checked daily chores by game-day label: choreId -> checkedAt. */
  dailyChecks: Record<string, Record<string, number>>;
};

export function emptyGameDays(): GameDays {
  return {
    initialized: false,
    firstSeen: {},
    countFrom: null,
    lastFixedLabel: null,
    lastAdvancedAt: 0,
    days: {},
    dailyChecks: {},
  };
}

export type Context = {
  now: number;
  region: Region;
  plays: boolean;
  /** Daily chores from the data file with the user's on/off setting applied. */
  dailyChores: readonly DailyChore[];
};

function maxLabel(labels: Iterable<string>): string | null {
  let max: string | null = null;
  for (const l of labels) if (max === null || l > max) max = l;
  return max;
}

/**
 * Undoes what a wrong future clock did once the clock moves back: removes records made after
 * `now`, reprocesses the days that had not ended by `now`, and moves first sightings back to `now`.
 * Checks are kept, so the corrected days are recorded again from them.
 */
function undoWrongClock(state: GameDays, ctx: Context): GameDays {
  const { now } = ctx;
  // A loop, not Math.max(...spread), so a huge number of records cannot overflow the call stack.
  let latest = state.lastAdvancedAt;
  for (const d of Object.values(state.days)) if (d.fixedAt > latest) latest = d.fixedAt;
  if (now >= latest - CLOCK_TOLERANCE_MS) return state;
  const entries = Object.entries(state.days);
  const days = Object.fromEntries(entries.filter(([, d]) => d.fixedAt <= now));
  const firstSeen = Object.fromEntries(
    Object.entries(state.firstSeen).map(([id, at]) => [id, Math.min(at, now)]),
  );
  // Days whose grace period had passed by `now` stay processed, so days skipped while the game
  // was off are not recorded later; days from the first removed record onward are reprocessed.
  let lastFixedLabel = state.lastFixedLabel;
  if (lastFixedLabel !== null) {
    const endedByNow = addDays(gameDayLabel(now - GRACE_MS, ctx.region), -1);
    const removed = entries.filter(([, d]) => d.fixedAt > now).map(([label]) => label);
    const bounds = [lastFixedLabel, endedByNow];
    if (removed.length > 0) bounds.push(addDays(minLabel(removed), -1));
    lastFixedLabel = minLabel(bounds);
    // Days recorded early by a region change stay processed.
    const kept = maxLabel(Object.keys(days));
    if (kept !== null && kept > lastFixedLabel) lastFixedLabel = kept;
  }
  // A start set under the wrong clock would block tracking until that date. Processed labels
  // still cannot be checked again, so moving it back to the current day cannot overlap.
  const todayStart = gameDayStart(gameDayLabel(now, ctx.region), ctx.region);
  const countFrom =
    state.countFrom !== null && state.countFrom > now ? todayStart : state.countFrom;
  return { ...state, days, firstSeen, lastFixedLabel, countFrom, lastAdvancedAt: now };
}

function minLabel(labels: readonly string[]): string {
  return labels.reduce((a, b) => (a < b ? a : b));
}

/** Seeds first-run state and the first sighting of new chores. */
function seeChores(state: GameDays, ctx: Context): GameDays {
  if (!state.initialized) {
    const firstSeen = Object.fromEntries(ctx.dailyChores.map((c) => [c.id, 0]));
    // Days before installation, including a previous day still in its grace period, are never recorded.
    return {
      ...state,
      initialized: true,
      firstSeen,
      countFrom: gameDayStart(gameDayLabel(ctx.now, ctx.region), ctx.region),
    };
  }
  const unseen = ctx.dailyChores.filter((c) => !(c.id in state.firstSeen));
  if (unseen.length === 0) return state;
  const firstSeen = { ...state.firstSeen };
  for (const c of unseen) firstSeen[c.id] = ctx.now;
  return { ...state, firstSeen };
}

/** The result of one game day under the current chores and settings. */
function evaluateDay(state: GameDays, ctx: Context, label: string): DayResult {
  const start = gameDayStart(label, ctx.region);
  const counted = ctx.dailyChores.filter(
    (c) => c.enabled && (state.firstSeen[c.id] ?? Infinity) < start,
  );
  if (counted.length === 0) return "untracked";
  const checks = state.dailyChecks[label] ?? {};
  return counted.every((c) => c.id in checks) ? "done" : "not-done";
}

function fixDay(state: GameDays, ctx: Context, label: string): GameDays {
  const days = ctx.plays
    ? { ...state.days, [label]: { result: evaluateDay(state, ctx, label), fixedAt: ctx.now } }
    : state.days;
  return { ...state, days, lastFixedLabel: label };
}

/** Fixes every game day whose grace period has passed, including days missed while the app was closed. */
function fixEndedDays(state: GameDays, ctx: Context): GameDays {
  if (state.countFrom === null) return state;
  const firstCounted = gameDayLabel(state.countFrom, ctx.region);
  let label =
    state.lastFixedLabel !== null && state.lastFixedLabel >= firstCounted
      ? addDays(state.lastFixedLabel, 1)
      : firstCounted;
  // One copy for the whole run keeps a long gap (app closed for months) linear.
  const days = { ...state.days };
  let lastFixedLabel = state.lastFixedLabel;
  while (gameDayEnd(label, ctx.region) + GRACE_MS <= ctx.now) {
    if (ctx.plays) days[label] = { result: evaluateDay(state, ctx, label), fixedAt: ctx.now };
    lastFixedLabel = label;
    label = addDays(label, 1);
  }
  return { ...state, days, lastFixedLabel };
}

/** Removes checks of recorded days a week after they were fixed. */
function dropOldChecks(state: GameDays, ctx: Context): GameDays {
  // Retention runs from when a day was fixed, so a wrong future clock cannot expire checks that a
  // later correction needs. Checks of days that were never recorded are kept.
  const expired = (label: string) => {
    const record = state.days[label];
    return record !== undefined && record.fixedAt + CHECK_RETENTION_MS <= ctx.now;
  };
  const dailyChecks = Object.fromEntries(
    Object.entries(state.dailyChecks).filter(([label]) => !expired(label)),
  );
  return { ...state, dailyChecks };
}

/** Brings the state up to `ctx.now`. Safe to run any number of times. */
export function advance(state: GameDays, ctx: Context): GameDays {
  let next = undoWrongClock(state, ctx);
  next = seeChores(next, ctx);
  next = fixEndedDays(next, ctx);
  next = dropOldChecks(next, ctx);
  // Never moves back, so repeated small steps backward still add up to a detected wrong clock.
  return { ...next, lastAdvancedAt: Math.max(next.lastAdvancedAt, ctx.now) };
}

/** Game-day labels whose daily chores can still be checked: the current day and, during the grace period, the previous one. */
export function editableDays(state: GameDays, ctx: Context): string[] {
  if (state.countFrom === null || ctx.now < state.countFrom) return [];
  const open = (label: string) => state.lastFixedLabel === null || label > state.lastFixedLabel;
  const today = gameDayLabel(ctx.now, ctx.region);
  const labels = open(today) ? [today] : [];
  const previous = addDays(today, -1);
  const inGrace = ctx.now < gameDayStart(today, ctx.region) + GRACE_MS;
  const previousCounts = gameDayStart(previous, ctx.region) >= state.countFrom;
  if (inGrace && previousCounts && open(previous)) labels.push(previous);
  return labels;
}

export function setDailyCheck(
  state: GameDays,
  ctx: Context,
  label: string,
  choreId: string,
  checked: boolean,
): GameDays {
  // A game that is not played has no checklist, so it never holds checks that a later
  // region change could attach to another region's day.
  if (!ctx.plays) throw new Error("The game is not played");
  if (!editableDays(state, ctx).includes(label)) throw new Error(`Day ${label} is not editable`);
  if (!ctx.dailyChores.some((c) => c.id === choreId && c.enabled)) {
    throw new Error(`Chore ${choreId} is not an enabled daily chore`);
  }
  const current = { ...(state.dailyChecks[label] ?? {}) };
  if (checked) current[choreId] = ctx.now;
  else delete current[choreId];
  return { ...state, dailyChecks: { ...state.dailyChecks, [label]: current } };
}

/**
 * Moves the game to another server region (PRD Q1, Design Doc "Region change").
 * `ctx` describes the old region; the returned state counts days of `newRegion` from `countFrom`.
 */
export function changeRegion(state: GameDays, ctx: Context, newRegion: Region): GameDays {
  let next = advance(state, ctx);
  const today = gameDayLabel(ctx.now, ctx.region);
  // Regions with the same offset share every game day, so nothing needs to move.
  if (gameDayStart(today, newRegion) === gameDayStart(today, ctx.region)) return next;

  const previous = addDays(today, -1);
  const counts = (label: string) =>
    next.countFrom !== null && gameDayStart(label, ctx.region) >= next.countFrom;
  const open = (label: string) => next.lastFixedLabel === null || label > next.lastFixedLabel;

  // A previous day still in its grace period is fixed first, then the day in progress if it has checks.
  if (counts(previous) && open(previous)) next = fixDay(next, ctx, previous);
  const hasChecks = Object.keys(next.dailyChecks[today] ?? {}).length > 0;
  if (counts(today) && open(today) && hasChecks) next = fixDay(next, ctx, today);

  // With nothing recorded yet, the new region's current day counts at once; otherwise counting
  // resumes with the first new-region day after the last recorded label that has not started.
  let first = gameDayLabel(ctx.now, newRegion);
  if (Object.keys(next.days).length > 0) {
    while (
      (next.lastFixedLabel !== null && first <= next.lastFixedLabel) ||
      gameDayStart(first, newRegion) < ctx.now
    ) {
      first = addDays(first, 1);
    }
  }
  return {
    ...next,
    countFrom: gameDayStart(first, newRegion),
    // Labels before the first counted day are never processed under the new region.
    lastFixedLabel: addDays(first, -1),
  };
}

/** Days to highlight: at least one tracked game and every tracked game done (PRD FR33). */
export function isAllDone(records: readonly (DayRecord | undefined)[]): boolean {
  const tracked = records.filter(
    (r): r is DayRecord => r !== undefined && r.result !== "untracked",
  );
  return tracked.length > 0 && tracked.every((r) => r.result === "done");
}

/**
 * The result so far of a counted day that has not been fixed yet: today, the previous day in
 * its grace period, or a day whose grace period just ended before the next advance fixes it.
 * Undefined when the game is not played, the day is before countFrom, or it is already
 * processed. During the day it follows the current chores and settings (PRD FR34).
 */
export function unfixedDayResult(
  state: GameDays,
  ctx: Context,
  label: string,
): DayResult | undefined {
  if (!ctx.plays || state.countFrom === null) return undefined;
  if (gameDayStart(label, ctx.region) < state.countFrom) return undefined;
  if (state.lastFixedLabel !== null && label <= state.lastFixedLabel) return undefined;
  if (label > gameDayLabel(ctx.now, ctx.region)) return undefined;
  return evaluateDay(state, ctx, label);
}
