import type { CSSProperties } from "react";
import { TURN_MS, useRefreshPhase } from "./useRefreshPhase";
import "./RefreshButton.css";

interface Props {
  busy: boolean;
  onRefresh: () => void;
}

/**
 * Shrinks to a disc, turns once, and grows back into its label.
 *
 * Each stage waits for the one before it, so the motion reads as one gesture rather than
 * a button that changes shape while its icon happens to spin.
 */
export function RefreshButton({ busy, onRefresh }: Props) {
  const phase = useRefreshPhase(busy);
  const working = phase !== "resting";

  return (
    <button
      type="button"
      className="refresh"
      style={{ "--turn-ms": `${TURN_MS}ms` } as CSSProperties}
      data-phase={phase}
      data-tour="refresh"
      onClick={onRefresh}
      disabled={working}
      aria-label="새로고침"
      aria-busy={working}
    >
      <svg className="refresh__icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
        <path d="M13.5 2v3.2h-3.2" />
      </svg>
      <span className="refresh__label">새로고침</span>
    </button>
  );
}
