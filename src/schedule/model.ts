// Builds the Schedule tab's rows for one game (PRD FR15, FR16): times resolved on the user's
// server, ongoing and upcoming entries, and entries removed once they end.
import type { DataFile } from "@/data/classify";
import { type Region, toInstant } from "@/time/clock";

type GameData = DataFile["games"]["genshin"];
type Text = { ko: string; en?: string };
type EntryType = "livestream" | "update" | "maintenance" | "event" | "endgame";

export type ScheduleRow = {
  id: string;
  type: EntryType;
  title: Text;
  start: number;
  /** null when the data file gives no end. */
  end: number | null;
  url?: string;
  estimated: boolean;
};

// An entry without an end, such as a livestream, leaves the list this long after it starts
// (Design Doc, "Allowed time kinds").
const NO_END_MS = 3 * 60 * 60 * 1000;

const visibleUntil = (row: ScheduleRow) => row.end ?? row.start + NO_END_MS;

export function scheduleRows(game: GameData, region: Region, now: number) {
  const entries: ScheduleRow[] = game.schedule.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    start: toInstant(e.start, region),
    end: e.end ? toInstant(e.end, region) : null,
    url: e.url,
    estimated: e.estimated === true,
  }));
  // Endgame periods come from the periodic chores' periods, so the owner enters them once.
  const chores = new Map(game.chores.map((c) => [c.id, c]));
  const periods: ScheduleRow[] = game.periods.flatMap((p) => {
    const chore = chores.get(p.choreId);
    if (!chore) return [];
    return [
      {
        id: `period-${p.id}`,
        type: "endgame" as const,
        title: chore.name,
        start: toInstant(p.start, region),
        end: toInstant(p.end, region),
        estimated: false,
      },
    ];
  });
  // Intervals are [start, end): an entry is gone at its end time.
  const current = [...entries, ...periods].filter((row) => now < visibleUntil(row));
  return {
    ongoing: current
      .filter((row) => row.start <= now)
      .sort((a, b) => visibleUntil(a) - visibleUntil(b)),
    upcoming: current.filter((row) => row.start > now).sort((a, b) => a.start - b.start),
  };
}

/** The data file's text in the UI language; English falls back to Korean (Design Doc, D2). */
export function localText(text: Text, language: string) {
  return language === "en" ? (text.en ?? text.ko) : text.ko;
}
