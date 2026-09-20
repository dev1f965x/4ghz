import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import type { GameEvent } from "./domain/event";

const now = new Date("2026-10-01T12:00:00");

function event(overrides: Partial<GameEvent> = {}): GameEvent {
  return {
    id: "genshin-livestream",
    game: "genshin",
    kind: "livestream",
    title: "6.0 특별 방송",
    startsAt: new Date("2026-10-04T20:00:00"),
    ...overrides,
  };
}

describe("App", () => {
  it("explains itself when there is nothing to show", () => {
    render(<App events={[]} now={now} />);

    expect(screen.getByRole("heading", { name: "4GHz", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("아직 불러온 일정이 없어요")).toBeInTheDocument();
  });

  it("lists an upcoming event with its countdown", () => {
    render(<App events={[event()]} now={now} />);

    expect(screen.getByRole("heading", { name: "6.0 특별 방송" })).toBeInTheDocument();
    expect(screen.getByText("3일 남음")).toBeInTheDocument();
    expect(screen.getByText("원신")).toBeInTheDocument();
  });

  it("separates what is airing now from what is ahead", () => {
    const airing = event({
      id: "starrail-stream",
      game: "starrail",
      title: "3.5 특별 방송",
      startsAt: new Date("2026-10-01T11:30:00"),
    });

    render(<App events={[event(), airing]} now={now} />);

    expect(screen.getByRole("heading", { name: "지금 진행 중" })).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "다가오는 일정" })).toBeInTheDocument();
  });

  it("says when the schedule was last fetched", () => {
    render(<App events={[event()]} fetchedAt={new Date("2026-10-01T09:00:00")} now={now} />);

    expect(screen.getByText("3시간 전 기준")).toBeInTheDocument();
  });

  it("leaves out events that are over", () => {
    const over = event({
      id: "old",
      title: "지난 방송",
      startsAt: new Date("2026-09-01T20:00:00"),
    });

    render(<App events={[over]} now={now} />);

    expect(screen.queryByRole("heading", { name: "지난 방송" })).not.toBeInTheDocument();
  });
});
