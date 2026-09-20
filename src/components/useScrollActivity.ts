import { type RefObject, useEffect, useState } from "react";

const IDLE_AFTER_MS = 900;

/**
 * Whether the element is being scrolled right now.
 *
 * Drives the scrollbar: it appears while the view moves and fades once the reader stops,
 * so nothing is drawn over the content while it is being read.
 */
export function useScrollActivity(ref: RefObject<HTMLElement | null>): boolean {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setScrolling(false), IDLE_AFTER_MS);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
      clearTimeout(idleTimer);
    };
  }, [ref]);

  return scrolling;
}
