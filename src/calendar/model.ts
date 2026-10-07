// The month grid (PRD FR31 to FR36): each game day's per-game result and the highlight. Fixed
// days come from the stored records; today and a previous day in its grace period are computed
// from the current checks, so their marks follow the checklist. Pure, on top of the time model.
import { choreContext, type GameData } from "@/chores/model";
import type { GameChores, GameId } from "@/state/schema";
import { gameIds } from "@/state/schema";
import { addDays, gameDayLabel, type Region } from "@/time/clock";
import { type DayResult, isAllDone, unfixedDayResult } from "@/time/days";

/** A game's state on one day; "none" is no record: not played, or before tracking began. */
export type GameMark = DayResult | "none";
type DayStatus = "past" | "pending" | "today" | "upcoming";

export type CalendarDay = {
  label: string;
  /** False for the days of the previous and next month that fill the first and last weeks. */
  inMonth: boolean;
  status: DayStatus;
  games: Record<GameId, GameMark>;
  /** Every tracked game is done (PRD FR33). */
  all: boolean;
};

export type CalendarInput = {
  chores: Record<GameId, GameChores>;
  /** Game data for the live results of open days; without it, open days show no marks. */
  games: Record<GameId, GameData> | null;
  region: Region;
  now: number;
};

/** "2026-10" for the month containing `label`. */
export const monthOf = (label: string) => label.slice(0, 7);

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

/** The weeks shown for `month`, Monday first, as game-day labels. */
export function monthLabels(month: string): string[][] {
  const first = new Date(`${month}-01T00:00:00Z`);
  // getUTCDay: 0 is Sunday; the grid starts on Monday.
  const lead = (first.getUTCDay() + 6) % 7;
  let label = addDays(`${month}-01`, -lead);
  const weeks: string[][] = [];
  do {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(label);
      label = addDays(label, 1);
    }
    weeks.push(week);
  } while (monthOf(label) === month);
  return weeks;
}

/** A day's live result while not yet fixed, or undefined once fixed or not counted. */
function unfixed(input: CalendarInput, game: GameId, label: string) {
  const data = input.games?.[game];
  if (!data) return undefined;
  return unfixedDayResult(input.chores[game], choreContext(data, input.region, input.now), label);
}

export function calendarDay(input: CalendarInput, label: string, month: string): CalendarDay {
  const today = gameDayLabel(input.now, input.region);
  const live = Object.fromEntries(gameIds.map((g) => [g, unfixed(input, g, label)])) as Record<
    GameId,
    DayResult | undefined
  >;
  const games = Object.fromEntries(
    gameIds.map((g) => [
      g,
      label > today ? "none" : (live[g] ?? input.chores[g].days[label]?.result ?? "none"),
    ]),
  ) as Record<GameId, GameMark>;
  let status: DayStatus = "past";
  if (label > today) status = "upcoming";
  else if (label === today) status = "today";
  // An earlier day is pending until every game has fixed it: during the grace period, and in
  // the moment between its end and the advance that records it.
  else if (gameIds.some((g) => live[g] !== undefined)) status = "pending";
  const all = isAllDone(
    gameIds.map((g) => {
      const mark = games[g];
      return mark === "none" ? undefined : { result: mark, fixedAt: 0 };
    }),
  );
  return { label, inMonth: monthOf(label) === month, status, games, all };
}

export function calendarMonth(input: CalendarInput, month: string): CalendarDay[][] {
  return monthLabels(month).map((week) => week.map((label) => calendarDay(input, label, month)));
}

/** The earliest month with a record, so the user can go back that far (PRD FR36). */
export function firstMonth(chores: Record<GameId, GameChores>, current: string): string {
  let first = current;
  for (const g of gameIds) {
    for (const label of Object.keys(chores[g].days)) {
      if (monthOf(label) < first) first = monthOf(label);
    }
  }
  return first;
}
