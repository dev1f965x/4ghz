import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshButton } from "./RefreshButton";

describe("RefreshButton", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("asks for a refresh when pressed", async () => {
    const onRefresh = vi.fn();
    render(<RefreshButton busy={false} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole("button", { name: "새로고침" }));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("keeps spinning briefly after a fetch that returns at once", async () => {
    const { rerender } = render(<RefreshButton busy={true} onRefresh={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-spinning", "true");

    rerender(<RefreshButton busy={false} onRefresh={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-spinning", "true");

    await act(async () => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole("button")).toHaveAttribute("data-spinning", "false");
  });
});
