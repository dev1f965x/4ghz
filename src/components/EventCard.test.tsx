import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameEvent } from "../domain/event";
import { phaseOf } from "../domain/schedule";
import { EventCard } from "./EventCard";

const now = new Date("2026-09-21T21:00:00+09:00");

function renderCard(overrides: Partial<GameEvent>) {
  const event: GameEvent = {
    id: "e",
    game: "genshin",
    kind: "livestream",
    title: "Special Program",
    startsAt: new Date("2026-09-23T20:14:22+09:00"),
    ...overrides,
  };
  render(<EventCard event={event} phase={phaseOf(event, now)} now={now} />);
  return screen.getByRole("article");
}

describe("EventCard countdown", () => {
  it("counts days and then the clock, to the second", () => {
    expect(renderCard({})).toHaveTextContent(/1일\s*23:14:22/);
  });

  it("drops the days when less than one is left", () => {
    const card = renderCard({ startsAt: new Date("2026-09-22T06:30:05+09:00") });

    expect(card).toHaveTextContent("09:30:05");
    expect(card.querySelector(".event__days")).toBeNull();
  });

  it("marks an event starting later today, with the time left", () => {
    const card = renderCard({ startsAt: new Date("2026-09-21T23:00:00+09:00") });

    expect(card).toHaveTextContent("오늘");
    expect(card).toHaveTextContent("02:00:00");
  });

  it("shows how long a running event has left", () => {
    const card = renderCard({
      startsAt: new Date("2026-09-16T11:00:00+09:00"),
      endsAt: new Date("2026-09-29T11:00:00+09:00"),
    });

    expect(card).toHaveTextContent("진행 중");
    expect(card).toHaveTextContent(/끝나기까지\s*7일\s*14:00:00/);
  });
});
