import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameFilter } from "../domain/filter";
import { GameFilterMenu } from "./GameFilterMenu";

function renderMenu(filter: GameFilter = "all") {
  const onChoose = vi.fn();
  render(
    <>
      <GameFilterMenu filter={filter} onChoose={onChoose} />
      <p>elsewhere</p>
    </>,
  );
  return {
    onChoose,
    trigger: screen.getByRole("button", {
      name: `게임: ${filter === "all" ? "전체" : "붕괴: 스타레일"}`,
    }),
  };
}

describe("GameFilterMenu", () => {
  it("opens a list of every choice, with the current one selected", async () => {
    const { trigger } = renderMenu("starrail");

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "전체",
      "원신",
      "붕괴: 스타레일",
      "젠레스 존 제로",
    ]);
    expect(screen.getByRole("option", { name: "붕괴: 스타레일" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("picks with the mouse and closes", async () => {
    const { onChoose, trigger } = renderMenu();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "원신" }));

    expect(onChoose).toHaveBeenCalledWith("genshin");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with the keyboard and hands focus back", async () => {
    const { onChoose, trigger } = renderMenu();

    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChoose).toHaveBeenCalledWith("starrail");
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape without choosing", async () => {
    const { onChoose, trigger } = renderMenu();

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("closes when the page is clicked elsewhere", async () => {
    const { trigger } = renderMenu();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByText("elsewhere"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
