// The Calendar's checklist for one game: which chores show, which are
// checked, which can be changed, and when each cycle resets. Pure, on top of the time model.
import type { DataFile } from "@/data/classify";
import type { GameChores } from "@/state/schema";
import {
  addDays,
  currentPeriod,
  DAY,
  gameDayEnd,
  gameDayLabel,
  gameDayStart,
  type Region,
  toInstant,
  weekEnd,
  weekLabel,
} from "@/time/clock";
import {
  advance,
  type Context,
  changeRegion,
  editableDays,
  fixGraceDay,
  GRACE_MS,
  setDailyCheck,
} from "@/time/days";

export type GameData = DataFile["games"]["genshin"];
type Chore = GameData["chores"][number];

export type ChoreItem = { id: string; name: Chore["name"]; checked: boolean };

export type Checklist = {
  /** The day before today while it can still be changed (the grace period). */
  previous: { label: string; editableUntil: number; items: ChoreItem[] } | null;
  daily: {
    label: string;
    items: ChoreItem[];
    resetsAt: number;
    /** Set while a region change waits for the new server's next day. */
    resumesAt: number | null;
  };
  weekly: { key: string; items: ChoreItem[]; resetsAt: number };
  /** Periodic chores; those without a current period are listed but not counted (FR26). */
  periodic: { items: (ChoreItem & { key: string | null; endsAt: number | null })[] };
};

/** The user's settings for one game. */
export type GamePrefs = {
  plays: boolean;
  region: Region;
  /** Chores turned on or off by the user; others follow enabledByDefault. */
  overrides: Record<string, boolean>;
};

export const choreEnabled = (chore: Chore, prefs: GamePrefs) =>
  prefs.overrides[chore.id] ?? chore.enabledByDefault;

const enabled = (chores: readonly Chore[], cycle: Chore["cycle"], prefs: GamePrefs) =>
  chores.filter((c) => c.cycle === cycle && choreEnabled(c, prefs));

/** The context the time model needs, from the game's data and the user's settings. */
export function choreContext(game: GameData, prefs: GamePrefs, now: number): Context {
  return {
    now,
    region: prefs.region,
    plays: prefs.plays,
    dailyChores: game.chores
      .filter((c) => c.cycle === "daily")
      .map((c) => ({ id: c.id, enabled: choreEnabled(c, prefs) })),
  };
}

export function checklist(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  now: number,
): Checklist {
  const { region } = prefs;
  const today = gameDayLabel(now, region);
  const editable = editableDays(state, choreContext(game, prefs, now));
  const item = (checks: Record<string, number> | undefined) => (c: Chore) => ({
    id: c.id,
    name: c.name,
    checked: checks?.[c.id] !== undefined,
  });

  const daily = enabled(game.chores, "daily", prefs);
  const previousLabel = addDays(today, -1);
  const previous = editable.includes(previousLabel)
    ? {
        label: previousLabel,
        editableUntil: gameDayStart(today, region) + GRACE_MS,
        items: daily.map(item(state.dailyChecks[previousLabel])),
      }
    : null;

  const week = `weekly:${weekLabel(now, region)}`;
  const periodic = enabled(game.chores, "periodic", prefs).map((c) => {
    const period = currentPeriod(
      game.periods.filter((p) => p.choreId === c.id),
      now,
      region,
    );
    const key = period ? `period:${period.id}` : null;
    return {
      ...item(key ? state.cycleChecks[key] : undefined)(c),
      key,
      endsAt: period ? toInstant(period.end, region) : null,
    };
  });

  return {
    previous,
    daily: {
      label: today,
      items: daily.map(item(state.dailyChecks[today])),
      resetsAt: gameDayEnd(today, region),
      resumesAt: state.countFrom !== null && state.countFrom > now ? state.countFrom : null,
    },
    weekly: {
      key: week,
      items: enabled(game.chores, "weekly", prefs).map(item(state.cycleChecks[week])),
      resetsAt: weekEnd(weekLabel(now, region), region),
    },
    periodic: { items: periodic },
  };
}

/**
 * Checks or unchecks a daily chore on `label`, or returns null when that day can no longer be
 * changed, such as a click that lands just after the grace period ends.
 */
export function checkDaily(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  now: number,
  label: string,
  choreId: string,
  checked: boolean,
): GameChores | null {
  const ctx = choreContext(game, prefs, now);
  // The day closed, the game was turned off, or the chore was turned off after the list was drawn.
  if (!ctx.plays || !editableDays(state, ctx).includes(label)) return null;
  if (!ctx.dailyChores.some((c) => c.id === choreId && c.enabled)) return null;
  const next = setDailyCheck(state, ctx, label, choreId, checked);
  return { ...state, ...next };
}

/**
 * The key of the cycle open now for a weekly or periodic chore, or null without one, or when
 * the chore is turned off or the game is not played.
 */
function currentCycleKey(game: GameData, choreId: string, prefs: GamePrefs, now: number) {
  const { region } = prefs;
  const chore = game.chores.find((c) => c.id === choreId);
  if (!prefs.plays || !chore || !choreEnabled(chore, prefs)) return null;
  if (chore?.cycle === "weekly") return `weekly:${weekLabel(now, region)}`;
  if (chore?.cycle !== "periodic") return null;
  const period = currentPeriod(
    game.periods.filter((p) => p.choreId === choreId),
    now,
    region,
  );
  return period ? `period:${period.id}` : null;
}

/**
 * Checks or unchecks a weekly or periodic chore in cycle `key`, or returns null when `key` is
 * no longer the chore's open cycle: a click on a list drawn just before the Monday reset.
 */
export function checkCycle(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  now: number,
  key: string,
  choreId: string,
  checked: boolean,
): GameChores | null {
  if (currentCycleKey(game, choreId, prefs, now) !== key) return null;
  const current = { ...(state.cycleChecks[key] ?? {}) };
  if (checked) current[choreId] = now;
  else delete current[choreId];
  return { ...state, cycleChecks: { ...state.cycleChecks, [key]: current } };
}

// Checks of an ended weekly or periodic cycle are kept this long, like daily checks.
const CYCLE_RETENTION_MS = 7 * DAY;

/**
 * Applies resets and missed days and drops checks of cycles that ended more
 * than a week ago. Retention counts from when the app first saw the cycle as ended, not from
 * the cycle's end, so a wrong future clock must last a week before it removes anything; when
 * the clock moves back before a cycle's end, the cycle is open again. A period missing from the
 * data file counts as ended, so a removed or renamed period keeps its checks for a week too.
 */
export function advanceChores(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  now: number,
): GameChores {
  const { region } = prefs;
  const advanced = advance(state, choreContext(game, prefs, now));
  const periodEnds = new Map(game.periods.map((p) => [`period:${p.id}`, toInstant(p.end, region)]));
  const cycleChecks: GameChores["cycleChecks"] = {};
  const cycleEndedAt: GameChores["cycleEndedAt"] = {};
  for (const [key, checks] of Object.entries(state.cycleChecks)) {
    const end = key.startsWith("weekly:")
      ? weekEnd(key.slice("weekly:".length), region)
      : periodEnds.get(key);
    if (end !== undefined && now < end) {
      cycleChecks[key] = checks;
      continue;
    }
    // A clock that moved back before the first sighting restarts the wait.
    const seen = Math.min(state.cycleEndedAt[key] ?? now, now);
    if (now < seen + CYCLE_RETENTION_MS) {
      cycleChecks[key] = checks;
      cycleEndedAt[key] = seen;
    }
  }
  return { ...advanced, cycleChecks, cycleEndedAt };
}

// lastAdvancedAt moves on every tick; saving only for that would rewrite state.json every 30
// seconds. A change of that field alone is saved once it is this old.
const ADVANCE_SAVE_GAP_MS = 10 * 60_000;

/**
 * True when an advance changed more than lastAdvancedAt, or moved it far from `savedAt`, the
 * lastAdvancedAt last written to state.json. The in-memory value moves on every tick, so the
 * gap is measured from the saved one.
 */
export function advanceNeedsSave(before: GameChores, after: GameChores, savedAt: number) {
  if (Math.abs(after.lastAdvancedAt - savedAt) >= ADVANCE_SAVE_GAP_MS) return true;
  const rest = (s: GameChores) => JSON.stringify({ ...s, lastAdvancedAt: 0 });
  return rest(before) !== rest(after);
}

/** The next instant at which `list` changes: a reset, the grace end, or a period end. */
export function nextChange(list: Checklist, now: number): number | null {
  const instants = [
    list.daily.resetsAt,
    list.daily.resumesAt,
    list.previous?.editableUntil,
    list.weekly.resetsAt,
    ...list.periodic.items.map((i) => i.endsAt),
  ].filter((t): t is number => typeof t === "number" && t > now);
  return instants.length === 0 ? null : Math.min(...instants);
}

export type RegionChange = {
  /** The state after the change, with weekly and periodic checks carried over by key. */
  next: GameChores;
  /**
   * What happens to today's daily record under the old server: "kept" fixes it with its checks,
   * "dropped" discards a day without checks, "none" when nothing moves, such as between
   * servers with the same reset or before tracking has a record.
   */
  today: { label: string; outcome: "kept" | "dropped" | "none" };
  /** When daily chores are recorded again; at or before `now` when they continue at once. */
  resumesAt: number;
};

/** Moves a game to another server; also used to preview the confirmation. */
export function changeGameRegion(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  newRegion: Region,
  now: number,
): RegionChange {
  const ctx = choreContext(game, prefs, now);
  const label = gameDayLabel(now, prefs.region);
  // Today matters only when it is a counted day still open under the old server; after an
  // earlier change the same day, or before tracking began, nothing is kept or dropped.
  const counted = prefs.plays && editableDays(advance(state, ctx), ctx).includes(label);
  const days = changeRegion(state, ctx, newRegion);
  const next = { ...state, ...days };
  const resumesAt = next.countFrom ?? now;
  let outcome: RegionChange["today"]["outcome"] = "none";
  if (counted && resumesAt > now) {
    outcome = next.days[label] === undefined ? "dropped" : "kept";
  }
  return { next, today: { label, outcome }, resumesAt };
}

/** Records the previous day if it is still in its grace period; used before turning a game off. */
export function fixGraceDayForGame(
  game: GameData,
  state: GameChores,
  prefs: GamePrefs,
  now: number,
): GameChores {
  return { ...state, ...fixGraceDay(state, choreContext(game, prefs, now)) };
}
