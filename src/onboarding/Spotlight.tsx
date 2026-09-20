import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardTop, GAP, type Hole } from "./placement";
import type { TourStep } from "./steps";
import "./Spotlight.css";

interface Props {
  step: TourStep;
  position: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

/** How far the cut-out reaches past the element it highlights. */
const PADDING = 8;

/**
 * Dims the window except for one element, and explains that element.
 *
 * The dimming is a single box shadow spread over the whole viewport from the cut-out, so
 * there is one element to paint rather than four strips to keep aligned.
 */
export function Spotlight({ step, position, total, onNext, onSkip }: Props) {
  const target = useTargetRect(step.target);
  const card = useRef<HTMLDivElement>(null);
  const cardHeight = useCardHeight(card, step.id);

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus has to follow the step
  useEffect(() => card.current?.focus(), [step.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
      if (event.key === "Enter") onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext, onSkip]);

  if (!target) return null;

  const hole: Hole = {
    top: target.top - PADDING,
    left: target.left - PADDING,
    width: target.width + PADDING * 2,
    height: target.height + PADDING * 2,
  };

  return (
    <div className="spotlight" role="presentation">
      <div className="spotlight__hole" style={hole} />
      <div
        className="spotlight__card"
        style={{
          top: cardTop({ hole, cardHeight, viewportHeight: window.innerHeight }),
          left: Math.max(hole.left, GAP),
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-${step.id}-title`}
        aria-describedby={`tour-${step.id}-detail`}
        tabIndex={-1}
        ref={card}
      >
        <p className="spotlight__count">
          {position} / {total}
        </p>
        <h2 className="spotlight__title" id={`tour-${step.id}-title`}>
          {step.title}
        </h2>
        <p className="spotlight__detail" id={`tour-${step.id}-detail`}>
          {step.detail}
        </p>
        <div className="spotlight__actions">
          <button type="button" className="spotlight__skip" onClick={onSkip}>
            건너뛰기
          </button>
          <button type="button" className="spotlight__next" onClick={onNext}>
            {position === total ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Follows the target through layout changes, so the cut-out never drifts off it. */
function useTargetRect(selector: string): Hole | undefined {
  const [rect, setRect] = useState<Hole>();

  useEffect(() => {
    const measure = () => {
      const target = document.querySelector(selector);
      if (!target) return setRect(undefined);

      const { top, left, width, height } = target.getBoundingClientRect();
      setRect({ top, left, width, height });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selector]);

  return rect;
}

/** Measures before paint, so a card that has to flip above never shows below first. */
function useCardHeight(card: React.RefObject<HTMLDivElement | null>, stepId: string): number {
  const [height, setHeight] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each step gets its own card
  useLayoutEffect(() => {
    setHeight(card.current?.offsetHeight ?? 0);
  }, [card, stepId]);

  return height;
}
