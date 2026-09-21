import type { GameEvent } from "../domain/event";
import {
  COUNTDOWN_LABELS,
  formatClock,
  formatStart,
  GAME_LABELS,
  KIND_LABELS,
  phaseLabel,
} from "../domain/labels";
import { type EventPhase, timeLeft } from "../domain/schedule";
import "./EventCard.css";

interface Props {
  event: GameEvent;
  phase: EventPhase;
  now: Date;
  /** Where the walkthrough can point; it points at the first card that carries it. */
  tourAnchor?: string;
}

/**
 * One announced event. The countdown carries the weight: it runs to the second, with the
 * days set largest. Today and running are badges, running with the time left until it ends.
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
      <Countdown event={event} phase={phase} now={now} />
    </article>
  );
}

function Countdown({ event, phase, now }: { event: GameEvent; phase: EventPhase; now: Date }) {
  if (phase.status === "running") {
    return (
      <div className="event__countdown">
        <p className="event__badge">{phaseLabel(phase)}</p>
        {event.endsAt && (
          <p className="event__until-end">
            {COUNTDOWN_LABELS.untilEnd} <Clock until={event.endsAt} now={now} />
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="event__countdown">
      {phase.status === "today" && <p className="event__badge">{phaseLabel(phase)}</p>}
      <p className="event__time">
        <Clock until={event.startsAt} now={now} />
      </p>
    </div>
  );
}

/** Days set large when there are any, then the rest as a ticking clock. */
function Clock({ until, now }: { until: Date; now: Date }) {
  const left = timeLeft(now, until);
  return (
    <>
      {left.days > 0 && (
        <>
          <span className="event__days">{left.days}</span>
          <span className="event__unit">{COUNTDOWN_LABELS.day}</span>
        </>
      )}
      <span className="event__clock">{formatClock(left)}</span>
    </>
  );
}
