import { useCallback, useEffect, useState } from "react";
import {
  type DailyRecords,
  EMPTY_RECORDS,
  type GameDay,
  toggleChore,
  toggleGame,
} from "../domain/dailies";
import type { Game } from "../domain/event";
import type { DailyRecordsMemory } from "./dailyRecords";

/** The player's dailies, loaded once and saved on every change. */
export function useDailyRecords(memory: DailyRecordsMemory) {
  const [records, setRecords] = useState<DailyRecords>(EMPTY_RECORDS);

  useEffect(() => {
    let cancelled = false;
    void memory.load().then((stored) => {
      if (!cancelled && stored) setRecords(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [memory]);

  const change = useCallback(
    (next: DailyRecords) => {
      setRecords(next);
      void memory.save(next);
    },
    [memory],
  );

  return {
    records,
    toggleChore: (day: GameDay, game: Game, chore: string) =>
      change(toggleChore(records, day, game, chore)),
    toggleGame: (game: Game) => change(toggleGame(records, game)),
  };
}
