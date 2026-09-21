import type { GameEvent } from "./event";

/** Where an event sits relative to now, from the viewer's point of view. */
export type EventPhase =
  | { readonly status: "upcoming"; readonly daysUntil: number }
  | { readonly status: "today" }
  | { readonly status: "running" }
  | { readonly status: "over" };

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How long an event with no announced end stays on screen after it starts.
 *
 * A livestream is announced as a single instant, and the viewer looks at this app while
 * it is airing. Dropping it the second it begins would empty the list at the moment it
 * matters most. Two hours covers a HoYoverse special program with room to spare.
 */
const MOMENTARY_EVENT_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Whole calendar days between two instants in the viewer's zone.
 *
 * Counting calendar days rather than 24-hour spans is what makes an event tomorrow
 * morning read as one day away, not zero, when it is looked at late tonight.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MILLISECONDS_PER_DAY);
}

function startOfDay(instant: Date): Date {
  const midnight = new Date(instant);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

/** An event with no announced end stays running for a grace window, then is over. */
export function phaseOf(event: GameEvent, now: Date): EventPhase {
  const hasStarted = event.startsAt.getTime() <= now.getTime();

  if (hasStarted) {
    const endsAt = event.endsAt?.getTime() ?? event.startsAt.getTime() + MOMENTARY_EVENT_GRACE_MS;
    return endsAt > now.getTime() ? { status: "running" } : { status: "over" };
  }

  const daysUntil = calendarDaysBetween(now, event.startsAt);
  return daysUntil === 0 ? { status: "today" } : { status: "upcoming", daysUntil };
}

/** Events the viewer can still act on, soonest first. Ties keep a stable order by title. */
export function upcomingFirst(events: readonly GameEvent[], now: Date): GameEvent[] {
  return events
    .filter((event) => phaseOf(event, now).status !== "over")
    .sort(
      (left, right) =>
        left.startsAt.getTime() - right.startsAt.getTime() || left.title.localeCompare(right.title),
    );
}
