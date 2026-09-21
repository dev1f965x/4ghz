import { useCallback, useEffect, useState } from "react";
import {
  back,
  canGoBack,
  canGoForward,
  currentTab,
  forward,
  type History,
  startAt,
  type Tab,
  visit,
} from "./history";

/** `MouseEvent.button` for the thumb buttons most mice carry. */
const MOUSE_BACK = 3;
const MOUSE_FORWARD = 4;

/**
 * The tab on screen and the way back and forward through the tabs seen before.
 *
 * Besides the title bar's arrows, it answers to `Alt+←`/`Alt+→` and to a mouse's side
 * buttons, the same inputs a browser takes.
 */
export function useNavigation(first: Tab = "schedule") {
  const [history, setHistory] = useState<History>(() => startAt(first));

  const goBack = useCallback(() => setHistory(back), []);
  const goForward = useCallback(() => setHistory(forward), []);
  const open = useCallback((tab: Tab) => setHistory((previous) => visit(previous, tab)), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "ArrowRight") goForward();
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === MOUSE_BACK) goBack();
      if (event.button === MOUSE_FORWARD) goForward();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [goBack, goForward]);

  return {
    tab: currentTab(history),
    open,
    goBack,
    goForward,
    canGoBack: canGoBack(history),
    canGoForward: canGoForward(history),
  };
}
