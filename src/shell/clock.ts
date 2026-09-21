import { useEffect, useState } from "react";

/** A second, because the countdowns print seconds. A re-render of a short list is cheap. */
const TICK_MS = 1_000;

/**
 * The current time, re-read on a timer.
 *
 * Every countdown on screen is derived from it, so a window left open overnight rolls its
 * days over on its own instead of freezing at whatever it said when it was opened.
 */
export function useNow(interval: number = TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);

  return now;
}
