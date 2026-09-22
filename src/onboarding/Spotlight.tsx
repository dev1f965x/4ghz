import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Hole, placeCard } from "./placement";
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
const PADDING = 4;

/**
 * Dims the window except for one element, and explains that element.
 *
 * The dimming is a single box shadow spread over the whole viewport from the cut-out, so
 * there is one element to paint rather than four strips to keep aligned.
 */
export function Spotlight({ step, position, total, onNext, onSkip }: Props) {
  const target = useTargetRect(step.target);
  const card = useRef<HTMLDivElement>(null);
  const cardSize = useCardSize(card, target);

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

  const hole = insideWindow({
    top: target.top - PADDING,
    left: target.left - PADDING,
    width: target.width + PADDING * 2,
    height: target.height + PADDING * 2,
  });

  return (
    <div className="spotlight" role="presentation">
      <div className="spotlight__hole" style={hole} />
      <div
        className="spotlight__card"
        style={placeCard({
          hole,
          card: cardSize,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        })}
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
          {position < total && (
            <button type="button" className="spotlight__skip" onClick={onSkip}>
              건너뛰기
            </button>
          )}
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

/**
 * Measures the card before paint, so one that has to move never shows in the wrong place
 * first. It measures again whenever the target does: the card only exists once there is
 * a target, and a new step or a resized window moves the target.
 */
function useCardSize(
  card: React.RefObject<HTMLDivElement | null>,
  target: Hole | undefined,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // biome-ignore lint/correctness/useExhaustiveDependencies: the card is re-measured as the target changes
  useLayoutEffect(() => {
    setSize({ width: card.current?.offsetWidth ?? 0, height: card.current?.offsetHeight ?? 0 });
  }, [card, target]);

  return size;
}

/** How close the cut-out may come to the window's edge: its outline, and 8px clear. */
const EDGE = 12;

/**
 * Trims the cut-out to the window, for targets that run the full width, like the tabs:
 * the sides come in, the top and bottom keep their padding, so the ring still takes in
 * everything the target shows, such as the selected tab's underline.
 */
function insideWindow(hole: Hole): Hole {
  const left = Math.max(hole.left, EDGE);
  const top = Math.max(hole.top, EDGE);
  const right = Math.min(hole.left + hole.width, window.innerWidth - EDGE);
  const bottom = Math.min(hole.top + hole.height, window.innerHeight - EDGE);
  return { top, left, width: right - left, height: bottom - top };
}
