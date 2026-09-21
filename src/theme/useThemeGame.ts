import { useCallback, useEffect, useState } from "react";
import { GAMES, type Game } from "../domain/event";
import type { ThemeMemory } from "./themeMemory";

/** The game whose colour the window wears. A first run wears the first game's. */
export function useThemeGame(memory: ThemeMemory) {
  const [game, setGame] = useState<Game>(GAMES[0]);

  useEffect(() => {
    let cancelled = false;
    void memory.load().then((stored) => {
      if (!cancelled && stored && GAMES.includes(stored)) setGame(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [memory]);

  const choose = useCallback(
    (next: Game) => {
      setGame(next);
      void memory.save(next);
    },
    [memory],
  );

  return { game, choose };
}
