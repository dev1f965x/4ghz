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

  const firstId = [...running, ...ahead][0]?.event.id;

  return (
    <div className="event-list">
      {running.length > 0 && (
        <section className="event-list__section" aria-labelledby="running-heading">
          <h2 className="event-list__heading" id="running-heading">
            진행 중인 일정
          </h2>
          {running.map(({ event, phase }) => (
            <EventCard
              key={event.id}
              event={event}
              phase={phase}
              now={now}
              tourAnchor={anchors(event.id === firstId, false)}
            />
          ))}
        </section>
      )}

      <section className="event-list__section" aria-labelledby="ahead-heading">
        <h2 className="event-list__heading" id="ahead-heading">
          다가오는 일정
        </h2>
        {ahead.map(({ event, phase }, index) => (
          <EventCard
            key={event.id}
            event={event}
            phase={phase}
            now={now}
            tourAnchor={anchors(event.id === firstId, index === 0)}
          />
        ))}
      </section>
    </div>
  );
}

/** The first card of all explains the colours; the first upcoming one, the countdown. */
function anchors(firstOfAll: boolean, firstAhead: boolean): string | undefined {
  const words = [firstAhead && "upcoming", firstOfAll && "game"].filter(Boolean);
  return words.length ? words.join(" ") : undefined;
}
