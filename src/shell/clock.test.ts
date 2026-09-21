import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "./clock";

describe("useNow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("moves on without anything else happening", () => {
    vi.setSystemTime(new Date("2026-09-21T09:00:00Z"));
    const { result } = renderHook(() => useNow());
    const first = result.current;

    act(() => void vi.advanceTimersByTime(60_000));

    expect(result.current.getTime()).toBe(new Date("2026-09-21T09:01:00Z").getTime());
    expect(result.current).not.toBe(first);
  });

  it("stops ticking once the window is gone", () => {
    const { unmount } = renderHook(() => useNow());
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
