import { type RefObject, useEffect } from "react";

/** How long one wheel notch takes to land. Long enough to glide, short enough to obey. */
const GLIDE_MS = 260;

/** Deltas smaller than this come from a trackpad, which already scrolls smoothly. */
const WHEEL_NOTCH_PX = 40;

/**
 * Turns the webview's stepped wheel scrolling into a glide.
 *
 * A mouse wheel arrives as a few large jumps, which reads as stiff. Trackpads and
 * keyboards are left alone: they already deliver motion of their own, and taking that
 * over would feel laggy.
 */
export function useSmoothWheel(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = element.scrollTop;
    let frame = 0;
    let startedAt = 0;
    let from = 0;

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / GLIDE_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      element.scrollTop = from + (target - from) * eased;

      frame = progress < 1 ? requestAnimationFrame(step) : 0;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) return;
      if (Math.abs(event.deltaY) < WHEEL_NOTCH_PX) return;

      event.preventDefault();
      const furthest = element.scrollHeight - element.clientHeight;
      const resting = frame === 0 ? element.scrollTop : target;
      target = Math.min(Math.max(resting + event.deltaY, 0), furthest);
      from = element.scrollTop;
      startedAt = performance.now();

      if (frame === 0) frame = requestAnimationFrame(step);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}
