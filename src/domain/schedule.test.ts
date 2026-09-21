import { describe, expect, it } from "vitest";
import type { GameEvent } from "./event";
import { calendarDaysBetween, phaseOf, upcomingFirst } from "./schedule";

function event(overrides: Partial<GameEvent> & Pick<GameEvent, "startsAt">): GameEvent {
  return {
    id: "e1",
    game: "genshin",
    kind: "livestream",
    title: "Special Program",
    ...overrides,
  };
}

describe("calendarDaysBetween", () => {
  it("counts calendar days, not 24-hour spans", () => {
    const lateTonight = new Date("2026-10-01T23:30:00");
    const tomorrowMorning = new Date("2026-10-02T09:00:00");

    expect(calendarDaysBetween(lateTonight, tomorrowMorning)).toBe(1);
  });

  it("is zero within the same day", () => {
    expect(
      calendarDaysBetween(new Date("2026-10-01T00:10:00"), new Date("2026-10-01T23:50:00")),
    ).toBe(0);
  });
});

describe("phaseOf", () => {
  const now = new Date("2026-10-01T12:00:00");

  it("reads an event starting later today as today", () => {
    expect(phaseOf(event({ startsAt: new Date("2026-10-01T19:00:00") }), now)).toEqual({
      status: "today",
    });
  });

  it("counts the days to a later event", () => {
    expect(phaseOf(event({ startsAt: new Date("2026-10-04T09:00:00") }), now)).toEqual({
      status: "upcoming",
      daysUntil: 3,
    });
  });

  it("reads a started event with a later end as running", () => {
    const running = event({
      startsAt: new Date("2026-09-28T09:00:00"),
      endsAt: new Date("2026-10-10T09:00:00"),
    });

    expect(phaseOf(running, now)).toEqual({ status: "running" });
  });

  it("keeps an event with no end on screen while it is likely still going", () => {
    expect(phaseOf(event({ startsAt: new Date("2026-10-01T11:59:00") }), now)).toEqual({
      status: "running",
    });
  });

  it("drops an event with no end once the grace window passes", () => {
    expect(phaseOf(event({ startsAt: new Date("2026-10-01T09:30:00") }), now)).toEqual({
      status: "over",
    });
  });

  it("treats an ended event as over", () => {
    const ended = event({
      startsAt: new Date("2026-09-01T09:00:00"),
      endsAt: new Date("2026-09-20T09:00:00"),
    });

    expect(phaseOf(ended, now)).toEqual({ status: "over" });
  });
});

describe("upcomingFirst", () => {
  const now = new Date("2026-10-01T12:00:00");

  it("drops what is over and sorts the rest by start", () => {
    const events = [
      event({ id: "later", title: "버전 업데이트", startsAt: new Date("2026-10-08T03:00:00") }),
      event({ id: "over", title: "지난 방송", startsAt: new Date("2026-09-01T09:00:00") }),
      event({ id: "soon", title: "Special Program", startsAt: new Date("2026-10-02T09:00:00") }),
    ];

    expect(upcomingFirst(events, now).map((found) => found.id)).toEqual(["soon", "later"]);
  });

  it("keeps a stable order when two events start together", () => {
    const sameInstant = new Date("2026-10-05T09:00:00");
    const events = [
      event({ id: "b", title: "나중 제목", startsAt: sameInstant }),
      event({ id: "a", title: "가나다 제목", startsAt: sameInstant }),
    ];

    expect(upcomingFirst(events, now).map((found) => found.id)).toEqual(["a", "b"]);
  });
});
