import { useEffect, useRef, useState } from "react";

/**
 * Holds a busy state on screen for at least `minimum` milliseconds.
 *
 * A fetch that answers in 80ms would otherwise flash its label for a single frame,
 * which reads as a glitch rather than as the app having done something.
 */
export function useMinimumDuration(active: boolean, minimum: number): boolean {
  const [lingering, setLingering] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      startedAt.current = Date.now();
      setLingering(true);
      return;
    }
    if (startedAt.current === null) return;

    const settle = () => {
      startedAt.current = null;
      setLingering(false);
    };
    const remaining = minimum - (Date.now() - startedAt.current);
    if (remaining <= 0) return settle();

    const timer = setTimeout(settle, remaining);
    return () => clearTimeout(timer);
  }, [active, minimum]);

  return active || lingering;
}
