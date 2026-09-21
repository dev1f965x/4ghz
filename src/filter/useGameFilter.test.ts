import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GameFilter } from "../domain/filter";
import type { FilterMemory } from "./filterMemory";
import { useGameFilter } from "./useGameFilter";

function memory(stored?: unknown) {
  const saved: GameFilter[] = [];
  const store: FilterMemory = {
    load: async () => stored,
    save: async (filter) => void saved.push(filter),
  };
  return { store, saved };
}

describe("useGameFilter", () => {
  it("looks at every game on a first run", () => {
    const { store } = memory();
    const { result } = renderHook(() => useGameFilter(store));

    expect(result.current.filter).toBe("all");
  });

  it("comes back to the game chosen last time", async () => {
    const { store } = memory("zenless");
    const { result } = renderHook(() => useGameFilter(store));

    await waitFor(() => expect(result.current.filter).toBe("zenless"));
  });

  it("ignores something it cannot read", async () => {
    const { store } = memory("pokemon");
    const { result } = renderHook(() => useGameFilter(store));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.filter).toBe("all");
  });

  it("remembers a new choice", () => {
    const { store, saved } = memory();
    const { result } = renderHook(() => useGameFilter(store));

    act(() => result.current.choose("starrail"));

    expect(result.current.filter).toBe("starrail");
    expect(saved).toEqual(["starrail"]);
  });
});
