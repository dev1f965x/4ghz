import { HistoryButtons } from "./HistoryButtons";
import { WindowControls } from "./WindowControls";
import "./TitleBar.css";

interface Props {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

/**
 * The strip the operating system would have drawn: back and forward at the left, where
 * a browser keeps them, and the window controls at the right. What the app itself does
 * lives in the header below.
 */
export function TitleBar(navigation: Props) {
  return (
    <div className="titlebar" data-tauri-drag-region>
      <HistoryButtons {...navigation} />
      <WindowControls />
    </div>
  );
}
