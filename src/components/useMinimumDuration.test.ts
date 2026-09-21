import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMinimumDuration } from "./useMinimumDuration";

describe("useMinimumDuration", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const render = (active: boolean) =>
    renderHook(({ active }) => useMinimumDuration(active, 600), { initialProps: { active } });

  it("stays idle when nothing happens", () => {
    const { result } = render(false);

    expect(result.current).toBe(false);
  });

  it("keeps a quick burst of work on screen for the minimum", () => {
    const { result, rerender } = render(true);

    act(() => void vi.advanceTimersByTime(80));
    rerender({ active: false });
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(519));
    expect(result.current).toBe(true);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("lets slow work end as soon as it ends", () => {
    const { result, rerender } = render(true);

    act(() => void vi.advanceTimersByTime(1500));
    rerender({ active: false });

    expect(result.current).toBe(false);
  });
});
