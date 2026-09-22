import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { GameEvent } from "./domain/event";
import type { Feed } from "./domain/feed";
import type { SyncState } from "./feed/sync";
import type { TourMemory } from "./onboarding/useTour";
import { noDailies, noFilter, noUsedCodes } from "./test/memories";

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
    title: "6.0 Special Program",
    startsAt: new Date("2026-10-04T20:00:00"),
    ...overrides,
  };
}

function ready(events: GameEvent[], extras: Partial<Extract<SyncState, { status: "ready" }>> = {}) {
  const feed: Feed = { schemaVersion: "1.0", publishedAt: now, events, codes: [] };
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
      <App
        state={{ status: "loading" }}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByText("불러오는 중이에요")).toBeInTheDocument();
  });

  it("lists an upcoming event with its countdown", () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "6.0 Special Program", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveTextContent(/3일\s*08:00:00/);
    expect(screen.getByText("3시간 전 업데이트")).toBeInTheDocument();
  });

  it("separates what is airing now from what is ahead", () => {
    const airing = event({
      id: "starrail-stream",
      game: "starrail",
      title: "3.5 Special Program",
      startsAt: new Date("2026-10-01T11:30:00"),
    });

    render(
      <App
        state={ready([event(), airing])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByRole("heading", { name: "진행 중인 일정" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "다가오는 일정" })).toBeInTheDocument();
  });

  it("offers a retry when nothing could be fetched", async () => {
    const onRefresh = vi.fn();
    render(
      <App
        state={{ status: "failed", problem: { kind: "offline", detail: "no network" } }}
        onRefresh={onRefresh}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByText("가져오지 못했어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("tells the viewer to update when the feed is too new to read", () => {
    render(
      <App
        state={{ status: "failed", problem: { kind: "unsupported-schema", found: "2.0" } }}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByText("앱을 업데이트해 주세요")).toBeInTheDocument();
  });

  it("keeps showing the old schedule and says so when a refresh failed", () => {
    const state = ready([event()], { lastProblem: { kind: "offline", detail: "no network" } });

    render(
      <App
        state={state}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByRole("heading", { name: "6.0 Special Program" })).toBeInTheDocument();
    expect(
      screen.getByText("최신 내용을 받지 못해 마지막으로 받은 내용을 보여주고 있어요"),
    ).toBeInTheDocument();
  });

  it("disables the refresh button while a refresh is running", () => {
    render(
      <App
        state={ready([event()], { refreshing: true })}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByRole("button", { name: "새로고침" })).toBeDisabled();
    expect(screen.getByText("새로고침 중…")).toBeInTheDocument();
  });

  it("opens a tab from the tab bar", async () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );
    expect(screen.getByRole("tab", { name: "일정" })).toHaveAttribute("aria-selected", "true");

    await userEvent.click(screen.getByRole("tab", { name: "리딤 코드" }));

    expect(screen.getByRole("tab", { name: "리딤 코드" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-codes");
  });

  it("moves between tabs with the arrow keys", async () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    screen.getByRole("tab", { name: "일정" }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "리딤 코드" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "리딤 코드" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps refresh in the bar on every tab", async () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "숙제" }));

    expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
  });

  it("shows each tab as an icon, keeping its name for screen readers and tooltips", () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    const codes = screen.getByRole("tab", { name: "리딤 코드" });
    expect(codes.querySelector("svg")).toBeInTheDocument();
    expect(codes).toHaveAttribute("title", "리딤 코드");
  });

  it("narrows every tab to the game picked, and wears its colour", async () => {
    const genshin = event();
    const zenless = event({ id: "zenless-version", game: "zenless", title: "3.3 Update" });
    const { container } = render(
      <App
        state={ready([genshin, zenless])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );
    expect(container.firstChild).not.toHaveAttribute("data-game");
    expect(screen.getByRole("heading", { name: "6.0 Special Program" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "게임: 전체" }));
    await userEvent.click(screen.getByRole("option", { name: "젠레스" }));

    expect(container.firstChild).toHaveAttribute("data-game", "zenless");
    expect(screen.queryByRole("heading", { name: "6.0 Special Program" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3.3 Update" })).toBeInTheDocument();
  });

  it("shows the version under the name", () => {
    render(
      <App
        state={ready([event()])}
        onRefresh={() => {}}
        tourMemory={seenTour}
        usedCodesMemory={noUsedCodes}
        dailiesMemory={noDailies}
        filterMemory={noFilter}
        now={now}
      />,
    );

    expect(screen.getByText(/^v[0-9]+[.][0-9]+[.][0-9]+$/)).toBeInTheDocument();
  });
});
