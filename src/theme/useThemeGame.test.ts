import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Game } from "../domain/event";
import type { ThemeMemory } from "./themeMemory";
import { useThemeGame } from "./useThemeGame";

function memory(stored?: Game) {
  const saved: Game[] = [];
  const store: ThemeMemory = {
    load: async () => stored,
    save: async (game) => void saved.push(game),
  };
  return { store, saved };
}

describe("useThemeGame", () => {
  it("wears the first game's colour on a first run", () => {
    const { store } = memory();
    const { result } = renderHook(() => useThemeGame(store));

    expect(result.current.game).toBe("genshin");
  });

  it("comes back to the game chosen last time", async () => {
    const { store } = memory("zenless");
    const { result } = renderHook(() => useThemeGame(store));

    await waitFor(() => expect(result.current.game).toBe("zenless"));
  });

  it("remembers a new choice", () => {
    const { store, saved } = memory();
    const { result } = renderHook(() => useThemeGame(store));

    act(() => result.current.choose("starrail"));

    expect(result.current.game).toBe("starrail");
    expect(saved).toEqual(["starrail"]);
  });
});
