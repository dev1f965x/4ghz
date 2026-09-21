import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import type { GameEvent } from "../domain/event";
import type { SyncState } from "../feed/sync";
import { noUsedCodes } from "../test/memories";
import { TOUR_STEPS } from "./steps";
import type { TourMemory } from "./useTour";

const now = new Date("2026-10-01T12:00:00");

const event: GameEvent = {
  id: "genshin-livestream",
  game: "genshin",
  kind: "livestream",
  title: "6.0 Special Program",
  startsAt: new Date("2026-10-04T20:00:00"),
};

const ready: SyncState = {
  status: "ready",
  cached: {
    feed: { schemaVersion: "1.0", publishedAt: now, events: [event], codes: [] },
    fetchedAt: now,
  },
  refreshing: false,
};

function memory(seen: boolean): TourMemory & { marked: boolean } {
  const state = {
    marked: false,
    async seen() {
      return seen;
    },
    async markSeen() {
      state.marked = true;
    },
  };
  return state;
}

describe("first run walkthrough", () => {
  it("opens on the first step once there is something to point at", async () => {
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={memory(false)}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(TOUR_STEPS[0].title);
    expect(screen.getByText(`1 / ${TOUR_STEPS.length}`)).toBeInTheDocument();
  });

  it("stays away once it has been seen", async () => {
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={memory(true)}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does not open while there is nothing on screen", async () => {
    render(
      <App
        state={{ status: "loading" }}
        onRefresh={() => {}}
        tourMemory={memory(false)}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("walks the steps and remembers that it finished", async () => {
    const remembered = memory(false);
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={remembered}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await screen.findByRole("dialog");
    for (const step of TOUR_STEPS.slice(1)) {
      await userEvent.click(screen.getByRole("button", { name: "다음" }));
      expect(screen.getByRole("dialog")).toHaveTextContent(step.title);
    }
    await userEvent.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(remembered.marked).toBe(true);
  });

  it("skips out of the way and does not come back", async () => {
    const remembered = memory(false);
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={remembered}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(remembered.marked).toBe(true);
  });

  it("closes on Escape", async () => {
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={memory(false)}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("moves on with Enter", async () => {
    render(
      <App
        state={ready}
        onRefresh={() => {}}
        tourMemory={memory(false)}
        usedCodesMemory={noUsedCodes}
        now={now}
      />,
    );

    await screen.findByRole("dialog");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toHaveTextContent(TOUR_STEPS[1].title);
  });
});
