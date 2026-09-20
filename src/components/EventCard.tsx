import type { GameEvent } from "../domain/event";
import { formatStart, GAME_LABELS, KIND_LABELS, phaseLabel } from "../domain/labels";
import type { EventPhase } from "../domain/schedule";
import "./EventCard.css";

interface Props {
  event: GameEvent;
  phase: EventPhase;
  now: Date;
}

/**
 * One announced event. The countdown carries the weight, so it sits on the right at the
 * largest size in the card and repeats its meaning as text for screen readers.
 */
export function EventCard({ event, phase, now }: Props) {
  return (
    <article className="event" data-game={event.game} data-status={phase.status}>
      <div className="event__meta">
        <span className="event__game">{GAME_LABELS[event.game]}</span>
        <span className="event__kind">{KIND_LABELS[event.kind]}</span>
      </div>
      <div className="event__body">
        <h3 className="event__title">{event.title}</h3>
        <p className="event__start">{formatStart(event.startsAt, now)}</p>
      </div>
      <p className="event__phase">{phaseLabel(phase)}</p>
    </article>
  );
}
