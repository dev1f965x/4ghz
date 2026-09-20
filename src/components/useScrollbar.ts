import { type RefObject, useEffect, useState } from "react";

/** How the thumb is being shown, which decides how fast it arrives. */
export type ScrollbarVisibility = "idle" | "scroll" | "pointer";

const IDLE_AFTER_MS = 900;

/** How close to the right edge the pointer counts as reaching for the scrollbar. */
const POINTER_REACH_PX = 24;

/**
 * Decides when the scrollbar is visible.
 *
 * Driven from events rather than `:hover` on the scrollbar pseudo-element, whose state
 * the webview updates unreliably: grazing the thumb twice would leave it stuck hidden.
 */
export function useScrollbar(ref: RefObject<HTMLElement | null>): ScrollbarVisibility {
  const [visibility, setVisibility] = useState<ScrollbarVisibility>("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let pointerNear = false;

    const goIdleLater = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!pointerNear) setVisibility("idle");
      }, IDLE_AFTER_MS);
    };

    const onScroll = () => {
      setVisibility(pointerNear ? "pointer" : "scroll");
      goIdleLater();
    };

    const onPointerMove = (event: PointerEvent) => {
      const { right } = element.getBoundingClientRect();
      const nowNear = right - event.clientX <= POINTER_REACH_PX;
      if (nowNear === pointerNear) return;

      pointerNear = nowNear;
      if (nowNear) {
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

    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);

    return () => {
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      clearTimeout(idleTimer);
    };
  }, [ref]);

  return visibility;
}
