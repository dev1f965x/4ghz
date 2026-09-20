import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WindowControls } from "./WindowControls";

vi.mock("../shell/window", () => ({
  appWindow: {
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

const { appWindow } = await import("../shell/window");

describe("WindowControls", () => {
  it.each([
    ["최소화", "minimize"],
    ["최대화", "toggleMaximize"],
    ["닫기", "close"],
  ] as const)("asks the window to %s", async (label, method) => {
    render(<WindowControls />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(appWindow[method]).toHaveBeenCalledOnce();
  });
});
