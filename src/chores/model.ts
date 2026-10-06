// The Calendar's checklist for one game (PRD FR25 to FR30, FR37): which chores show, which are
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
import { advance, type Context, editableDays, GRACE_MS, setDailyCheck } from "@/time/days";

type GameData = DataFile["games"]["genshin"];
type Chore = GameData["chores"][number];

export type ChoreItem = { id: string; name: Chore["name"]; checked: boolean };

export type Checklist = {
  /** The day before today while it can still be changed (the grace period, PRD Q5). */
  previous: { label: string; editableUntil: number; items: ChoreItem[] } | null;
  daily: {
    label: string;
    items: ChoreItem[];
    resetsAt: number;
    /** Set while a region change waits for the new server's next day (PRD Q1). */
    resumesAt: number | null;
  };
  weekly: { key: string; items: ChoreItem[]; resetsAt: number };
  /** Periodic chores; those without a current period are listed but not counted (FR26). */
  periodic: { items: (ChoreItem & { key: string | null; endsAt: number | null })[] };
};

const enabled = (chores: readonly Chore[], cycle: Chore["cycle"]) =>
  chores.filter((c) => c.cycle === cycle && c.enabledByDefault);

/** The context the time model needs; settings for playing and region arrive with GHZ-20. */
function choreContext(game: GameData, region: Region, now: number): Context {
  return {
    now,
    region,
    plays: true,
    dailyChores: game.chores
      .filter((c) => c.cycle === "daily")
      .map((c) => ({ id: c.id, enabled: c.enabledByDefault })),
  };
}

export function checklist(
  game: GameData,
  state: GameChores,
  region: Region,
  now: number,
): Checklist {
  const today = gameDayLabel(now, region);
  const editable = editableDays(state, choreContext(game, region, now));
  const item = (checks: Record<string, number> | undefined) => (c: Chore) => ({
    id: c.id,
    name: c.name,
    checked: checks?.[c.id] !== undefined,
  });

  const daily = enabled(game.chores, "daily");
  const previousLabel = addDays(today, -1);
  const previous = editable.includes(previousLabel)
    ? {
        label: previousLabel,
        editableUntil: gameDayStart(today, region) + GRACE_MS,
        items: daily.map(item(state.dailyChecks[previousLabel])),
      }
    : null;

  const week = `weekly:${weekLabel(now, region)}`;
  const periodic = enabled(game.chores, "periodic").map((c) => {
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
      items: enabled(game.chores, "weekly").map(item(state.cycleChecks[week])),
      resetsAt: weekEnd(weekLabel(now, region), region),
    },
    periodic: { items: periodic },
  };
}

/** Checks or unchecks a daily chore on an editable day; throws for any other day. */
export function checkDaily(
  game: GameData,
  state: GameChores,
  region: Region,
  now: number,
  label: string,
  choreId: string,
  checked: boolean,
): GameChores {
  const next = setDailyCheck(state, choreContext(game, region, now), label, choreId, checked);
  return { ...next, cycleChecks: state.cycleChecks };
}

/** Checks or unchecks a weekly or periodic chore in the cycle `key`. */
export function checkCycle(
  state: GameChores,
  now: number,
  key: string,
  choreId: string,
  checked: boolean,
): GameChores {
  const current = { ...(state.cycleChecks[key] ?? {}) };
  if (checked) current[choreId] = now;
  else delete current[choreId];
  return { ...state, cycleChecks: { ...state.cycleChecks, [key]: current } };
}

// Checks of an ended weekly or periodic cycle are kept this long, like daily checks.
const CYCLE_RETENTION_MS = 7 * DAY;

/**
 * Applies resets and missed days (PRD FR28, FR29) and drops checks of cycles that ended more
 * than a week ago. A period that no longer exists in the data file has ended for good.
 */
export function advanceChores(
  game: GameData,
  state: GameChores,
  region: Region,
  now: number,
): GameChores {
  const days = advance(state, choreContext(game, region, now));
  const periodEnds = new Map(game.periods.map((p) => [`period:${p.id}`, toInstant(p.end, region)]));
  const cycleChecks = Object.fromEntries(
    Object.entries(state.cycleChecks).filter(([key]) => {
      let end: number | undefined;
      if (key.startsWith("weekly:")) end = weekEnd(key.slice("weekly:".length), region);
      else end = periodEnds.get(key);
      return end !== undefined && now < end + CYCLE_RETENTION_MS;
    }),
  );
  return { ...days, cycleChecks };
}
