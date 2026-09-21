import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type DailyRecords, EMPTY_RECORDS, toggleChore } from "../domain/dailies";
import type { GameFilter } from "../domain/filter";
import { DailiesTab } from "./DailiesTab";

/** 21:00 in Korea on Monday 21 September 2026: well inside the game day of the 21st. */
const now = new Date("2026-09-21T21:00:00+09:00");

function finish(records: DailyRecords, day: string): DailyRecords {
  return toggleChore(toggleChore(records, day, "genshin", "commissions"), day, "genshin", "resin");
}

function renderTab(records: DailyRecords = EMPTY_RECORDS, filter: GameFilter = "all") {
  const onToggleChore = vi.fn();
  const onToggleGame = vi.fn();
  render(
    <DailiesTab
      records={records}
      filter={filter}
      now={now}
      onToggleChore={onToggleChore}
      onToggleGame={onToggleGame}
    />,
  );
  return { onToggleChore, onToggleGame };
}

describe("DailiesTab", () => {
  it("heads today's list with the game day", () => {
    renderTab();

    expect(screen.getByRole("heading", { name: "9월 21일 (월)" })).toBeInTheDocument();
  });

  it("checks a chore off for today", async () => {
    const { onToggleChore } = renderTab();

    await userEvent.click(screen.getByRole("checkbox", { name: "레진 소모" }));

    expect(onToggleChore).toHaveBeenCalledWith("2026-09-21", "genshin", "resin");
  });

  it("shows each game's streak", () => {
    const records = finish(finish(EMPTY_RECORDS, "2026-09-19"), "2026-09-20");
    renderTab(records);

    const genshin = screen.getByText("원신", { selector: ".dailies__name" }).closest("li");
    expect(genshin && within(genshin).getByText("2일 연속")).toBeInTheDocument();
  });

  it("lists only the games the player picked", () => {
    renderTab({ ...EMPTY_RECORDS, games: ["zenless"] });

    expect(screen.getByRole("checkbox", { name: "배터리 소모" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "레진 소모" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "원신" })).toHaveAttribute("aria-pressed", "false");
  });

  it("asks for a game when none is picked", () => {
    renderTab({ ...EMPTY_RECORDS, games: [] });

    expect(screen.getByText("하는 게임을 하나 이상 골라 주세요")).toBeInTheDocument();
  });
});

describe("DailiesTab with one game picked", () => {
  it("lists only that game", () => {
    renderTab(EMPTY_RECORDS, "starrail");

    expect(screen.getByRole("checkbox", { name: "일일 훈련" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "레진 소모" })).not.toBeInTheDocument();
  });

  it("offers to track the game when it is switched off", async () => {
    const { onToggleGame } = renderTab({ ...EMPTY_RECORDS, games: ["genshin"] }, "zenless");

    expect(screen.getByText("젠레스은 숙제 목록에서 꺼져 있어요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "켜기" }));
    expect(onToggleGame).toHaveBeenCalledWith("zenless");
  });
});

describe("MonthCalendar", () => {
  it("marks a finished day for screen readers too", () => {
    renderTab(finish(EMPTY_RECORDS, "2026-09-20"));

    expect(screen.getByText("원신 완료")).toBeInTheDocument();
  });

  it("steps between months", async () => {
    renderTab();
    expect(screen.getByRole("heading", { name: "2026년 9월" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음 달" }));
    expect(screen.getByRole("heading", { name: "2026년 10월" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "지난달" }));
    await userEvent.click(screen.getByRole("button", { name: "지난달" }));
    expect(screen.getByRole("heading", { name: "2026년 8월" })).toBeInTheDocument();
  });
});
