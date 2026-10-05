// Records game-day results for one game, following the Design Doc's "Time and reset logic".
// Pure functions: callers pass the current instant and store the returned state.
import { addDays, DAY, gameDayEnd, gameDayLabel, gameDayStart, type Region } from "./clock";

// The previous game day stays editable for this long after the daily reset.
export const GRACE_MS = 2 * 60 * 60 * 1000;
// A clock that moved back by more than this is treated as wrong (Design Doc, Clock changes).
const CLOCK_TOLERANCE_MS = 60 * 1000;
// Checks of cycles that ended longer ago than this are no longer kept.
const CHECK_RETENTION_MS = 7 * DAY;

type DayResult = "done" | "not-done" | "untracked";
export type DayRecord = { result: DayResult; fixedAt: number };

type DailyChore = { id: string; enabled: boolean };

/** Everything the app stores for one game's day history. */
export type GameDays = {
  initialized: boolean;
  /** Instant from which a chore counts; 0 means it counts in every cycle. */
  firstSeen: Record<string, number>;
  /** Start of the first game day that is recorded. */
  countFrom: number | null;
  /** Highest game-day label already processed, recorded or skipped. */
  lastFixedLabel: string | null;
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

/** Removes records made under a clock that has since moved back. */
function undoWrongClock(state: GameDays, now: number): GameDays {
  const latest = Math.max(0, ...Object.values(state.days).map((d) => d.fixedAt));
  if (now >= latest - CLOCK_TOLERANCE_MS) return state;
  const days = Object.fromEntries(Object.entries(state.days).filter(([, d]) => d.fixedAt <= now));
  return { ...state, days, lastFixedLabel: maxLabel(Object.keys(days)) };
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
  let next = state;
  while (gameDayEnd(label, ctx.region) + GRACE_MS <= ctx.now) {
    if (gameDayStart(label, ctx.region) >= state.countFrom) next = fixDay(next, ctx, label);
    label = addDays(label, 1);
  }
  return next;
}

function dropOldChecks(state: GameDays, ctx: Context): GameDays {
  // Retention runs from the moment a day was fixed, so a wrong future clock cannot expire checks
  // that a later correction needs to record the day again.
  const expired = (label: string) => {
    const record = state.days[label];
    if (record) return record.fixedAt + CHECK_RETENTION_MS <= ctx.now;
    const processed = state.lastFixedLabel !== null && label <= state.lastFixedLabel;
    return processed && gameDayEnd(label, ctx.region) + CHECK_RETENTION_MS <= ctx.now;
  };
  const dailyChecks = Object.fromEntries(
    Object.entries(state.dailyChecks).filter(([label]) => !expired(label)),
  );
  return { ...state, dailyChecks };
}

/** Brings the state up to `ctx.now`. Safe to run any number of times. */
export function advance(state: GameDays, ctx: Context): GameDays {
  let next = undoWrongClock(state, ctx.now);
  next = seeChores(next, ctx);
  next = fixEndedDays(next, ctx);
  return dropOldChecks(next, ctx);
}

/** Game-day labels whose daily chores can still be checked: the current day and, during the grace period, the previous one. */
export function editableDays(state: GameDays, ctx: Context): string[] {
  const today = gameDayLabel(ctx.now, ctx.region);
  if (state.countFrom === null || ctx.now < state.countFrom) return [];
  const labels = [today];
  const previous = addDays(today, -1);
  const inGrace = ctx.now < gameDayStart(today, ctx.region) + GRACE_MS;
  const previousCounts = gameDayStart(previous, ctx.region) >= state.countFrom;
  const previousOpen = state.lastFixedLabel === null || previous > state.lastFixedLabel;
  if (inGrace && previousCounts && previousOpen) labels.push(previous);
  return labels;
}

export function setDailyCheck(
  state: GameDays,
  ctx: Context,
  label: string,
  choreId: string,
  checked: boolean,
): GameDays {
  if (!editableDays(state, ctx).includes(label)) throw new Error(`Day ${label} is not editable`);
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
  const previous = addDays(today, -1);
  const counts = (label: string) =>
    next.countFrom !== null && gameDayStart(label, ctx.region) >= next.countFrom;
  const open = (label: string) => next.lastFixedLabel === null || label > next.lastFixedLabel;

  // A previous day still in its grace period is fixed first, then the day in progress if it has checks.
  if (counts(previous) && open(previous)) next = fixDay(next, ctx, previous);
  const hasChecks = Object.keys(next.dailyChecks[today] ?? {}).length > 0;
  if (counts(today) && open(today) && hasChecks) next = fixDay(next, ctx, today);

  const newToday = gameDayLabel(ctx.now, newRegion);
  const hasRecords = Object.keys(next.days).length > 0;
  let first = newToday;
  if (hasRecords) {
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
    // Labels before the first counted day are never recorded under the new region.
    lastFixedLabel: hasRecords ? addDays(first, -1) : next.lastFixedLabel,
  };
}

/** Days to highlight: at least one tracked game and every tracked game done (PRD FR33). */
export function isAllDone(records: readonly (DayRecord | undefined)[]): boolean {
  const tracked = records.filter(
    (r): r is DayRecord => r !== undefined && r.result !== "untracked",
  );
  return tracked.length > 0 && tracked.every((r) => r.result === "done");
}
