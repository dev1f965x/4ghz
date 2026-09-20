import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { ThumbGeometry } from "./scrollbarGeometry";
import { dragScale, MINIMUM_THUMB_PX, thumbGeometry } from "./scrollbarGeometry";
import "./Scrollbar.css";

interface Props {
  target: RefObject<HTMLElement | null>;
}

/** How the thumb is being shown, which decides how fast it arrives and leaves. */
type Visibility = "idle" | "scroll" | "pointer";

const IDLE_AFTER_MS = 900;

/** How close to the right edge the pointer counts as reaching for the scrollbar. */
const POINTER_REACH_PX = 28;

/**
 * The scrollbar, drawn by the app.
 *
 * The browser's own one is styled through `::-webkit-scrollbar`, which accepts no
 * transitions, so it can only appear and vanish. A real element can fade.
 */
export function Scrollbar({ target }: Props) {
  const [thumb, setThumb] = useState<ThumbGeometry>();
  const [visibility, setVisibility] = useState<Visibility>("idle");
  const dragging = useRef<{ startY: number; startTop: number } | null>(null);

  const measure = useCallback(() => {
    const element = target.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    setThumb(thumbGeometry({ scrollTop, scrollHeight, clientHeight }));
  }, [target]);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let pointerNear = false;

    const goIdleLater = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!pointerNear && !dragging.current) setVisibility("idle");
      }, IDLE_AFTER_MS);
    };

    const onScroll = () => {
      measure();
      setVisibility(pointerNear ? "pointer" : "scroll");
      goIdleLater();
    };

    const onPointerMove = (event: PointerEvent) => {
      const near = element.getBoundingClientRect().right - event.clientX <= POINTER_REACH_PX;
      if (near === pointerNear) return;

      pointerNear = near;
      if (near) {
        clearTimeout(idleTimer);
        setVisibility("pointer");
      } else {
        goIdleLater();
      }
    };

    const onPointerLeave = () => {
      pointerNear = false;
      goIdleLater();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);
    measure();

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      clearTimeout(idleTimer);
    };
  }, [target, measure]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = target.current;
    if (!element) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { startY: event.clientY, startTop: element.scrollTop };
    setVisibility("pointer");
  };

  const onPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = target.current;
    const start = dragging.current;
    if (!element || !start) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const scale = dragScale(
      { scrollTop, scrollHeight, clientHeight },
      thumb?.length ?? MINIMUM_THUMB_PX,
    );
    element.scrollTop = start.startTop + (event.clientY - start.startY) * scale;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragging.current = null;
  };

  if (!thumb) return null;

  return (
    <div className="scrollbar" data-visibility={visibility} aria-hidden="true">
      <div
        className="scrollbar__thumb"
        style={{ transform: `translateY(${thumb.offset}px)`, height: thumb.length }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerDrag}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
