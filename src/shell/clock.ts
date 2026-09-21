import { useEffect, useState } from "react";

/** Half a minute: fast enough that "1분 전" never arrives late, cheap enough to ignore. */
const TICK_MS = 30_000;

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
