import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { GameEvent } from "./domain/event";
import type { Feed } from "./domain/feed";
import type { SyncState } from "./feed/sync";
import type { TourMemory } from "./onboarding/useTour";

/** The walkthrough is covered on its own; here it stays out of the way. */
const seenTour: TourMemory = {
  async seen() {
    return true;
  },
  async markSeen() {},
};

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

function ready(events: GameEvent[], extras: Partial<Extract<SyncState, { status: "ready" }>> = {}) {
  const feed: Feed = { schemaVersion: "1.0", publishedAt: now, events };
  return {
    status: "ready",
    cached: { feed, fetchedAt: new Date("2026-10-01T09:00:00") },
    refreshing: false,
    ...extras,
  } satisfies SyncState;
}

describe("App", () => {
  it("says it is working while the first fetch runs", () => {
    render(
      <App state={{ status: "loading" }} onRefresh={() => {}} tourMemory={seenTour} now={now} />,
    );

    expect(screen.getByText("일정을 불러오는 중이에요")).toBeInTheDocument();
  });

  it("lists an upcoming event with its countdown", () => {
    render(<App state={ready([event()])} onRefresh={() => {}} tourMemory={seenTour} now={now} />);

    expect(screen.getByRole("heading", { name: "6.0 특별 방송", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("3일 남음")).toBeInTheDocument();
    expect(screen.getByText("3시간 전")).toBeInTheDocument();
  });

  it("separates what is airing now from what is ahead", () => {
    const airing = event({
      id: "starrail-stream",
      game: "starrail",
      title: "3.5 특별 방송",
      startsAt: new Date("2026-10-01T11:30:00"),
    });

    render(
      <App state={ready([event(), airing])} onRefresh={() => {}} tourMemory={seenTour} now={now} />,
    );

    expect(screen.getByRole("heading", { name: "지금 진행 중" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "다가오는 일정" })).toBeInTheDocument();
  });

  it("offers a retry when nothing could be fetched", async () => {
    const onRefresh = vi.fn();
    render(
      <App
        state={{ status: "failed", problem: { kind: "offline", detail: "no network" } }}
        onRefresh={onRefresh}
        tourMemory={seenTour}
        now={now}
      />,
    );

    expect(screen.getByText("일정을 가져오지 못했어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("tells the viewer to update when the feed is too new to read", () => {
    render(
      <App
        state={{ status: "failed", problem: { kind: "unsupported-schema", found: "2.0" } }}
        onRefresh={() => {}}
        tourMemory={seenTour}
        now={now}
      />,
    );

    expect(screen.getByText("앱을 업데이트해 주세요")).toBeInTheDocument();
  });

  it("keeps showing the old schedule and says so when a refresh failed", () => {
    const state = ready([event()], { lastProblem: { kind: "offline", detail: "no network" } });

    render(<App state={state} onRefresh={() => {}} tourMemory={seenTour} now={now} />);

    expect(screen.getByRole("heading", { name: "6.0 특별 방송" })).toBeInTheDocument();
    expect(
      screen.getByText("최신 일정을 받지 못해 마지막으로 받은 내용을 보여주고 있어요"),
    ).toBeInTheDocument();
  });

  it("disables the refresh button while a refresh is running", () => {
    render(
      <App
        state={ready([event()], { refreshing: true })}
        onRefresh={() => {}}
        tourMemory={seenTour}
        now={now}
      />,
    );

    expect(screen.getByRole("button", { name: "새로고침" })).toBeDisabled();
    expect(screen.getByText("새로고침 중…")).toBeInTheDocument();
  });
});
