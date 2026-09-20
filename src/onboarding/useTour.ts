import { useCallback, useEffect, useState } from "react";
import { TOUR_STEPS } from "./steps";

/** Remembers whether the walkthrough was already finished, across restarts. */
export interface TourMemory {
  seen(): Promise<boolean>;
  markSeen(): Promise<void>;
}

/**
 * Walks through the steps once.
 *
 * It waits for something to point at: on a first run the window may still be fetching,
 * and a spotlight on an empty list explains nothing.
 */
export function useTour(memory: TourMemory, ready: boolean) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    void memory.seen().then((seen) => {
      if (!cancelled && !seen) setIndex(0);
    });

    return () => {
      cancelled = true;
    };
  }, [memory, ready]);

  const finish = useCallback(() => {
    setIndex(null);
    void memory.markSeen();
  }, [memory]);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current === null) return null;
      const following = current + 1;
      if (following < TOUR_STEPS.length) return following;

      void memory.markSeen();
      return null;
    });
  }, [memory]);

  return {
    step: index === null ? undefined : TOUR_STEPS[index],
    position: index === null ? 0 : index + 1,
    total: TOUR_STEPS.length,
    next,
    skip: finish,
  };
}
