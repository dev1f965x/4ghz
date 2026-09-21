import type { GameEvent } from "../domain/event";
import {
  DAYS_LEFT_UNIT,
  formatStart,
  GAME_LABELS,
  KIND_LABELS,
  phaseLabel,
} from "../domain/labels";
import type { EventPhase } from "../domain/schedule";
import "./EventCard.css";

interface Props {
  event: GameEvent;
  phase: EventPhase;
  now: Date;
  /** Where the walkthrough can point; it points at the first card that carries it. */
  tourAnchor?: string;
}

/**
 * One announced event. The countdown carries the weight: the number of days is the
 * largest thing in the card, and today or running reads as a coloured badge instead.
 */
export function EventCard({ event, phase, now, tourAnchor }: Props) {
  return (
    <article
      className="event"
      data-game={event.game}
      data-status={phase.status}
      data-tour={tourAnchor}
    >
      <div className="event__meta">
        <span className="event__game" data-tour="game">
          {GAME_LABELS[event.game]}
        </span>
        <span className="event__kind">{KIND_LABELS[event.kind]}</span>
      </div>
      <div className="event__body">
        <h3 className="event__title">{event.title}</h3>
        <p className="event__start">{formatStart(event.startsAt, now)}</p>
      </div>
      <Countdown phase={phase} />
    </article>
  );
}

function Countdown({ phase }: { phase: EventPhase }) {
  if (phase.status !== "upcoming") {
    return <p className="event__badge">{phaseLabel(phase)}</p>;
  }
  return (
    <p className="event__countdown">
      <span className="event__days">{phase.daysUntil}</span>
      <span className="event__unit">{DAYS_LEFT_UNIT}</span>
    </p>
  );
}
