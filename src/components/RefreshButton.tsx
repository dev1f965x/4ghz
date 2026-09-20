import { useEffect, useState } from "react";
import "./RefreshButton.css";

interface Props {
  busy: boolean;
  onRefresh: () => void;
}

/** A spin lasts at least this long, so a fetch that returns at once still reads as one. */
const MINIMUM_SPIN_MS = 700;

/**
 * Collapses into a spinning disc while the schedule is being fetched, then grows back
 * into its label. The label is the resting state; the spin is the feedback.
 */
export function RefreshButton({ busy, onRefresh }: Props) {
  const spinning = useMinimumDuration(busy, MINIMUM_SPIN_MS);

  return (
    <button
      type="button"
      className="refresh"
      data-spinning={spinning}
      data-tour="refresh"
      onClick={onRefresh}
      disabled={spinning}
      aria-label="새로고침"
      aria-busy={spinning}
    >
      <svg className="refresh__icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
        <path d="M13.5 2v3.2h-3.2" />
      </svg>
      <span className="refresh__label">새로고침</span>
    </button>
  );
}

/** Keeps a flag raised for a while after it drops, so short work is still visible. */
function useMinimumDuration(active: boolean, duration: number): boolean {
  const [held, setHeld] = useState(active);

  useEffect(() => {
    if (active) {
      setHeld(true);
      return;
    }

    const timer = setTimeout(() => setHeld(false), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  return held;
}
