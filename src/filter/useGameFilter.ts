import { useCallback, useEffect, useState } from "react";
import { type GameFilter, isGameFilter } from "../domain/filter";
import type { FilterMemory } from "./filterMemory";

/**
 * The game every tab narrows to, and whose colour the window wears. A first run looks
 * at all three; anything unreadable in storage is treated the same way.
 */
export function useGameFilter(memory: FilterMemory) {
  const [filter, setFilter] = useState<GameFilter>("all");

  useEffect(() => {
    let cancelled = false;
    void memory.load().then((stored) => {
      if (!cancelled && isGameFilter(stored)) setFilter(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [memory]);

  const choose = useCallback(
    (next: GameFilter) => {
      setFilter(next);
      void memory.save(next);
    },
    [memory],
  );

  return { filter, choose };
}
