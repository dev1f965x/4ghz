import { WindowControls } from "./WindowControls";
import "./TitleBar.css";

/**
 * The strip the operating system would have drawn. It holds the window controls and
 * nothing else: everything the app does lives in the header below, so the two kinds of
 * buttons never sit in the same row.
 */
export function TitleBar() {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <WindowControls />
    </div>
  );
}
