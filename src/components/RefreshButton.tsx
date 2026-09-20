import "./RefreshButton.css";

interface Props {
  busy: boolean;
  onRefresh: () => void;
}

/** Fetches the schedule again. Disabled while a fetch is already running. */
export function RefreshButton({ busy, onRefresh }: Props) {
  return (
    <button
      type="button"
      className="refresh"
      data-tour="refresh"
      onClick={onRefresh}
      disabled={busy}
      aria-busy={busy}
    >
      새로고침
    </button>
  );
}
