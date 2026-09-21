import { REFRESH_LABEL } from "../domain/labels";
import "./RefreshButton.css";

interface Props {
  busy: boolean;
  /** When the feed was last fetched, for the tooltip. */
  fetched?: string;
  onRefresh: () => void;
}

/**
 * Fetches the schedule again. An icon, since the fetch time beside it already says what
 * it is about; the name is there for screen readers and as a tooltip.
 */
export function RefreshButton({ busy, fetched, onRefresh }: Props) {
  return (
    <button
      type="button"
      className="refresh"
      onClick={onRefresh}
      disabled={busy}
      aria-busy={busy}
      aria-label={REFRESH_LABEL}
      title={fetched ? `${fetched} · ${REFRESH_LABEL}` : REFRESH_LABEL}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
        <path d="M13.5 2.5v3h-3" />
      </svg>
    </button>
  );
}
