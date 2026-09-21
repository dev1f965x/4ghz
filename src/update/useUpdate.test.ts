import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvailableUpdate, UpdateSource } from "./ports";
import { UPDATE_CHECK_INTERVAL_MS, useUpdate } from "./useUpdate";

function release(install: AvailableUpdate["install"] = async () => {}): AvailableUpdate {
  return { version: "1.1.0", install };
}

/** The window holds one source for its lifetime, so the tests build it once too. */
function watch(check: UpdateSource["check"]) {
  const source: UpdateSource = { check };
  return renderHook(() => useUpdate(source));
}

describe("useUpdate", () => {
  afterEach(() => vi.useRealTimers());

  it("stays quiet when this build is the latest", async () => {
    const check = vi.fn(async () => null);
    const { result } = watch(check);

    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(result.current.update).toEqual({ status: "current" });
  });

  it("stays quiet when it cannot tell", async () => {
    const check = vi.fn(async () => {
      throw new Error("offline");
    });
    const { result } = watch(check);

    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(result.current.update).toEqual({ status: "current" });
  });

  it("announces a newer release", async () => {
    const { result } = watch(async () => release());

    await waitFor(() =>
      expect(result.current.update).toEqual({ status: "available", version: "1.1.0" }),
    );
  });

  it("reports download progress while installing", async () => {
    let report: (progress: number | null) => void = () => {};
    let finish: () => void = () => {};
    const install = (onProgress: (progress: number | null) => void) =>
      new Promise<void>((resolve) => {
        report = onProgress;
        finish = resolve;
      });
    const { result } = watch(async () => release(install));
    await waitFor(() => expect(result.current.update.status).toBe("available"));

    act(() => void result.current.install());
    act(() => report(0.4));

    expect(result.current.update).toEqual({
      status: "installing",
      version: "1.1.0",
      progress: 0.4,
    });
    await act(async () => finish());
  });

  it("says so when the install fails, so it can be tried again", async () => {
    const { result } = watch(async () =>
      release(async () => {
        throw new Error("signature mismatch");
      }),
    );
    await waitFor(() => expect(result.current.update.status).toBe("available"));

    await act(() => result.current.install());

    expect(result.current.update).toEqual({ status: "failed", version: "1.1.0" });
  });

  it("looks again every six hours", async () => {
    vi.useFakeTimers();
    const check = vi.fn(async () => null);
    watch(check);
    expect(check).toHaveBeenCalledTimes(1);

    await act(async () => void vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS));

    expect(check).toHaveBeenCalledTimes(2);
  });
});
