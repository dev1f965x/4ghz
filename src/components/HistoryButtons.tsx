import { NAVIGATION_LABELS } from "../domain/labels";
import "./HistoryButtons.css";

interface Props {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

/** Back and forward through the tabs seen before, where a browser keeps them. */
export function HistoryButtons({ canGoBack, canGoForward, onBack, onForward }: Props) {
  return (
    <div className="history-buttons">
      <button
        type="button"
        className="history-buttons__button"
        aria-label={NAVIGATION_LABELS.back}
        disabled={!canGoBack}
        onClick={onBack}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M10 6H2M5.5 2.5 2 6l3.5 3.5" />
        </svg>
      </button>
      <button
        type="button"
        className="history-buttons__button"
        aria-label={NAVIGATION_LABELS.forward}
        disabled={!canGoForward}
        onClick={onForward}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8M6.5 2.5 10 6 6.5 9.5" />
        </svg>
      </button>
    </div>
  );
}
