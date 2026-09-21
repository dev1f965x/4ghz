import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UsedCodesMemory } from "./usedCodes";
import { useUsedCodes } from "./useUsedCodes";

function memory(initial: string[] = []) {
  const saved: string[][] = [];
  const store: UsedCodesMemory = {
    load: async () => initial,
    save: async (keys) => void saved.push(keys),
  };
  return { store, saved };
}

describe("useUsedCodes", () => {
  it("starts from what was remembered", async () => {
    const { store } = memory(["genshin:GENSHINGIFT"]);
    const { result } = renderHook(() => useUsedCodes(store));

    await waitFor(() => expect(result.current.used.has("genshin:GENSHINGIFT")).toBe(true));
  });

  it("marks and unmarks a code, saving each time", async () => {
    const { store, saved } = memory();
    const { result } = renderHook(() => useUsedCodes(store));

    act(() => result.current.toggle("zenless:ZENLESSGIFT"));
    expect(result.current.used.has("zenless:ZENLESSGIFT")).toBe(true);

    act(() => result.current.toggle("zenless:ZENLESSGIFT"));
    expect(result.current.used.size).toBe(0);
    expect(saved).toEqual([["zenless:ZENLESSGIFT"], []]);
  });
});
