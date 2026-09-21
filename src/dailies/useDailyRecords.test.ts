import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type DailyRecords, EMPTY_RECORDS, isDone } from "../domain/dailies";
import type { DailyRecordsMemory } from "./dailyRecords";
import { useDailyRecords } from "./useDailyRecords";

function memory(stored?: DailyRecords) {
  const saved: DailyRecords[] = [];
  const store: DailyRecordsMemory = {
    load: async () => stored,
    save: async (records) => void saved.push(records),
  };
  return { store, saved };
}

describe("useDailyRecords", () => {
  it("starts with every game and nothing done on a first run", () => {
    const { store } = memory();
    const { result } = renderHook(() => useDailyRecords(store));

    expect(result.current.records).toEqual(EMPTY_RECORDS);
  });

  it("picks up what was stored", async () => {
    const stored = { ...EMPTY_RECORDS, games: ["zenless" as const] };
    const { store } = memory(stored);
    const { result } = renderHook(() => useDailyRecords(store));

    await waitFor(() => expect(result.current.records.games).toEqual(["zenless"]));
  });

  it("saves each check", () => {
    const { store, saved } = memory();
    const { result } = renderHook(() => useDailyRecords(store));

    act(() => result.current.toggleChore("2026-09-21", "genshin", "resin"));

    expect(isDone(result.current.records, "2026-09-21", "genshin", "resin")).toBe(true);
    expect(saved).toHaveLength(1);
  });
});
