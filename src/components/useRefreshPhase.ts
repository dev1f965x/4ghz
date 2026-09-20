import { useEffect, useState } from "react";

/**
 * The stages the refresh button moves through.
 *
 * They run in order and never overlap: the button finishes shrinking before the arrow
 * turns, and the arrow comes to rest on a whole turn before the label returns.
 */
export type RefreshPhase = "resting" | "collapsing" | "turning" | "expanding";

export const COLLAPSE_MS = 200;
export const TURN_MS = 700;
export const EXPAND_MS = 200;

export function useRefreshPhase(busy: boolean): RefreshPhase {
  const [phase, setPhase] = useState<RefreshPhase>("resting");

  useEffect(() => {
    if (busy && phase === "resting") setPhase("collapsing");
  }, [busy, phase]);

  useEffect(() => {
    if (phase === "resting") return;

    const after = (delay: number, next: RefreshPhase) => {
      const timer = setTimeout(() => setPhase(next), delay);
      return () => clearTimeout(timer);
    };

    if (phase === "collapsing") return after(COLLAPSE_MS, "turning");
    if (phase === "expanding") return after(EXPAND_MS, "resting");

    // Turning: check on every whole rotation, and keep going while work remains.
    const timer = setInterval(() => {
      if (!busy) setPhase("expanding");
    }, TURN_MS);
    return () => clearInterval(timer);
  }, [phase, busy]);

  return phase;
}
