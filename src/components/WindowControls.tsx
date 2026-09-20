import { appWindow } from "../shell/window";
import "./WindowControls.css";

/**
 * Minimize, maximize, and close, drawn by the app because the native title bar cannot
 * follow the theme. Icons are inline paths at Windows' own 10px metrics, so the buttons
 * read as system chrome rather than as app buttons.
 */
export function WindowControls() {
  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-controls__button"
        aria-label="최소화"
        onClick={() => void appWindow.minimize()}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 5h10" />
        </svg>
      </button>
      <button
        type="button"
        className="window-controls__button"
        aria-label="최대화"
        onClick={() => void appWindow.toggleMaximize()}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <rect x="0.5" y="0.5" width="9" height="9" />
        </svg>
      </button>
      <button
        type="button"
        className="window-controls__button window-controls__button--close"
        aria-label="닫기"
        onClick={() => void appWindow.close()}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 0l10 10M10 0L0 10" />
        </svg>
      </button>
    </div>
  );
}
