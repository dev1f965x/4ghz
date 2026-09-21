import type { GameEvent } from "../domain/event";
import { phaseOf, upcomingFirst } from "../domain/schedule";
import { EventCard } from "./EventCard";
import "./EventList.css";

interface Props {
  events: readonly GameEvent[];
  now: Date;
}

/** Everything still ahead, soonest first, with what is airing right now lifted out. */
export function EventList({ events, now }: Props) {
  const visible = upcomingFirst(events, now).map((event) => ({
    event,
    phase: phaseOf(event, now),
  }));

  const running = visible.filter((entry) => entry.phase.status === "running");
  const ahead = visible.filter((entry) => entry.phase.status !== "running");

  return (
    <div className="event-list">
      {running.length > 0 && (
        <section className="event-list__section" aria-labelledby="running-heading">
          <h2 className="event-list__heading" id="running-heading">
            지금 진행 중
          </h2>
          {running.map(({ event, phase }) => (
            <EventCard key={event.id} event={event} phase={phase} now={now} />
          ))}
        </section>
      )}

      <section className="event-list__section" aria-labelledby="ahead-heading">
        <h2 className="event-list__heading" id="ahead-heading">
          다가오는 일정
        </h2>
        {ahead.map(({ event, phase }) => (
          <EventCard key={event.id} event={event} phase={phase} now={now} tourAnchor="upcoming" />
        ))}
      </section>
    </div>
  );
}
