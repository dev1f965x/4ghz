import { useEffect, useState } from "react";

/**
 * The current time, updated every `intervalMs` so relative labels such as "just now" age, and
 * at once when the window regains focus or becomes visible, as after sleep. With `nextChange`,
 * it also updates at that instant, so a list changes exactly at a reset, not up to an interval
 * later.
 */
export function useNow(intervalMs: number, nextChange: number | null = null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, intervalMs);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [intervalMs]);
  useEffect(() => {
    if (nextChange === null) return;
    // setTimeout holds at most about 24.8 days; the interval covers anything further out.
    const delay = nextChange - Date.now();
    if (delay > 2 ** 31 - 1) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [nextChange]);
  return now;
}
