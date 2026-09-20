import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshButton } from "./RefreshButton";
import { COLLAPSE_MS, EXPAND_MS, TURN_MS } from "./useRefreshPhase";

const phase = () => screen.getByRole("button").getAttribute("data-phase");

const wait = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe("RefreshButton", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("asks for a refresh when pressed", async () => {
    const onRefresh = vi.fn();
    render(<RefreshButton busy={false} onRefresh={onRefresh} />);

    await userEvent.click(screen.getByRole("button", { name: "새로고침" }));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("shrinks, then turns, then grows back", async () => {
    const { rerender } = render(<RefreshButton busy={false} onRefresh={() => {}} />);
    expect(phase()).toBe("resting");

    rerender(<RefreshButton busy={true} onRefresh={() => {}} />);
    expect(phase()).toBe("collapsing");

    await wait(COLLAPSE_MS);
    expect(phase()).toBe("turning");

    rerender(<RefreshButton busy={false} onRefresh={() => {}} />);
    expect(phase()).toBe("turning");

    await wait(TURN_MS);
    expect(phase()).toBe("expanding");

    await wait(EXPAND_MS);
    expect(phase()).toBe("resting");
  });

  it("finishes the turn it is in rather than stopping mid-rotation", async () => {
    const { rerender } = render(<RefreshButton busy={true} onRefresh={() => {}} />);
    await wait(COLLAPSE_MS);

    rerender(<RefreshButton busy={false} onRefresh={() => {}} />);
    await wait(TURN_MS - 1);
    expect(phase()).toBe("turning");

    await wait(1);
    expect(phase()).toBe("expanding");
  });

  it("keeps turning while the fetch is still running", async () => {
    render(<RefreshButton busy={true} onRefresh={() => {}} />);
    await wait(COLLAPSE_MS);

    await wait(TURN_MS * 3);

    expect(phase()).toBe("turning");
  });

  it("cannot be pressed again until it comes to rest", async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<RefreshButton busy={true} onRefresh={onRefresh} />);
    await wait(COLLAPSE_MS);

    rerender(<RefreshButton busy={false} onRefresh={onRefresh} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
