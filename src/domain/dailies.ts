import { GAMES, type Game } from "./event";

/** A day in the games' own calendar, as `YYYY-MM-DD`. */
export type GameDay = string;

/** Something a game asks of the player every day, as the feed publishes it. */
export interface Chore {
  /** Stable: the player's checks are recorded under it. */
  id: string;
  /** Shown as written, in Korean. */
  title: string;
  /** The first game day it is due; before it, the chore did not exist yet. */
  from?: GameDay;
  /** The last game day it is due; after it, the chore is retired. */
  until?: GameDay;
}

/** Each game's chores, retired and upcoming ones included, so past days keep their meaning. */
export type Chores = Readonly<Record<Game, readonly Chore[]>>;

/** The player's own records: which games they play, and which chores they finished when. */
export interface DailyRecords {
  games: readonly Game[];
  done: Readonly<Record<GameDay, Partial<Record<Game, readonly string[]>>>>;
}

export const EMPTY_RECORDS: DailyRecords = { games: GAMES, done: {} };

/**
 * All three games reset their dailies at 04:00 on the Asia server, which runs on UTC+8.
 * Shifting an instant by +8h and then −4h puts that moment at midnight, so the date of
 * the shifted instant, read in UTC, is the game's day.
 */
const RESET_SHIFT_MS = (8 - 4) * 60 * 60 * 1000;

export function gameDay(instant: Date): GameDay {
  return new Date(instant.getTime() + RESET_SHIFT_MS).toISOString().slice(0, 10);
}

export function addDays(day: GameDay, count: number): GameDay {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** The game's chores that were, are, or will be due on `day`. */
export function choresOn(chores: Chores, game: Game, day: GameDay): readonly Chore[] {
  return chores[game].filter(
    (chore) => (!chore.from || chore.from <= day) && (!chore.until || day <= chore.until),
  );
}

export function isDone(records: DailyRecords, day: GameDay, game: Game, chore: string): boolean {
  return records.done[day]?.[game]?.includes(chore) ?? false;
}

/** Every chore due that day was done. A day with nothing due is not a finished day. */
export function isComplete(
  records: DailyRecords,
  chores: Chores,
  day: GameDay,
  game: Game,
): boolean {
  const due = choresOn(chores, game, day);
  return due.length > 0 && due.every((chore) => isDone(records, day, game, chore.id));
}

export function toggleChore(
  records: DailyRecords,
  day: GameDay,
  game: Game,
  chore: string,
): DailyRecords {
  const today = records.done[day] ?? {};
  const finished = today[game] ?? [];
  const next = finished.includes(chore)
    ? finished.filter((each) => each !== chore)
    : [...finished, chore];

  return { ...records, done: { ...records.done, [day]: { ...today, [game]: next } } };
}

export function toggleGame(records: DailyRecords, game: Game): DailyRecords {
  const games = records.games.includes(game)
    ? records.games.filter((each) => each !== game)
    : GAMES.filter((each) => each === game || records.games.includes(each));

  return { ...records, games };
}

/** A day on which every game the player looks at was finished. */
export function isPerfectDay(
  records: DailyRecords,
  chores: Chores,
  day: GameDay,
  games: readonly Game[],
): boolean {
  return games.length > 0 && games.every((game) => isComplete(records, chores, day, game));
}

/**
 * Days in a row with every chore of the game done. An unfinished today does not break
 * it yet — the day is not over — so the count starts from yesterday until today is done.
 */
export function streak(records: DailyRecords, chores: Chores, game: Game, today: GameDay): number {
  let day = isComplete(records, chores, today, game) ? today : addDays(today, -1);
  let count = 0;
  while (isComplete(records, chores, day, game)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** The days of a month laid out by week, Sunday first, with blanks before the first. */
export function monthGrid(year: number, month: number): (GameDay | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (GameDay | null)[] = [
    ...Array.from({ length: first.getUTCDay() }, () => null),
    ...Array.from({ length }, (_, index) => addDays(first.toISOString().slice(0, 10), index)),
  ];

  const weeks: (GameDay | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    const week = cells.slice(start, start + 7);
    weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => null)]);
  }
  return weeks;
}
