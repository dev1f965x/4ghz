// The app's single local store, wired to state.json, and its React binding.
import { useSyncExternalStore } from "react";
import { advanceChores, checkCycle, checkDaily } from "@/chores/model";
import type { DataFile } from "@/data/classify";
import { readStore, writeStore } from "@/storage";
import type { Region } from "@/time/clock";
import { type GameId, gameIds, type LocalState } from "./schema";
import { createLocalStore } from "./store";

// The server is chosen in Settings (GHZ-20); until then every game uses the default, Asia.
export const REGION: Region = "asia";

const localStore = createLocalStore({
  read: () => readStore("state"),
  write: (contents) => writeStore("state", contents),
  // No log file exists yet; the console reaches the WebView2 developer tools.
  logError: (message, error) => console.error(message, error),
});

/** Loads state.json; called once before the first render so the last game and tab show at once. */
export function loadLocalState() {
  return localStore.load();
}

export function useLocalState() {
  return useSyncExternalStore(localStore.subscribe, localStore.getSnapshot);
}

export function updateSettings(patch: Partial<LocalState["settings"]>) {
  return localStore.update((state) => ({ ...state, settings: { ...state.settings, ...patch } }));
}

// Codes are unique ignoring case (data file rules), so a mark survives a case fix in the data.
const codeKey = (code: string) => code.toUpperCase();

export function isRedeemed(state: LocalState, game: GameId, code: string) {
  return state.redeemedCodes[game].includes(codeKey(code));
}

export function setRedeemed(game: GameId, code: string, redeemed: boolean) {
  return localStore.update((state) => {
    const others = state.redeemedCodes[game].filter((c) => c !== codeKey(code));
    return {
      ...state,
      redeemedCodes: {
        ...state.redeemedCodes,
        [game]: redeemed ? [...others, codeKey(code)] : others,
      },
    };
  });
}

// Saving only because lastAdvancedAt moved would rewrite state.json every 30 seconds. Below
// this gap such a change stays unsaved; it only sharpens wrong-clock detection.
const ADVANCE_SAVE_GAP_MS = 10 * 60_000;

/** Applies resets and missed days to every game (PRD FR28, FR29); saves only real changes. */
export function advanceAllChores(data: DataFile, now: number) {
  const { state } = localStore.getSnapshot();
  const next = Object.fromEntries(
    gameIds.map((g) => [g, advanceChores(data.games[g], state.chores[g], REGION, now)]),
  ) as LocalState["chores"];
  const meaningful = gameIds.some((g) => {
    const before = state.chores[g];
    const after = next[g];
    if (after.lastAdvancedAt - before.lastAdvancedAt >= ADVANCE_SAVE_GAP_MS) return true;
    return (
      JSON.stringify({ ...after, lastAdvancedAt: 0 }) !==
      JSON.stringify({ ...before, lastAdvancedAt: 0 })
    );
  });
  if (meaningful) void localStore.update((s) => ({ ...s, chores: next }));
}

export function checkDailyChore(
  data: DataFile,
  game: GameId,
  label: string,
  choreId: string,
  checked: boolean,
  now: number,
) {
  const { state } = localStore.getSnapshot();
  let next: LocalState["chores"][GameId];
  try {
    next = checkDaily(data.games[game], state.chores[game], REGION, now, label, choreId, checked);
  } catch (error) {
    // The day closed between showing the box and the click; the next render shows it closed.
    console.error(`Checking ${choreId} on ${label} was refused`, error);
    return Promise.resolve();
  }
  return localStore.update((s) => ({ ...s, chores: { ...s.chores, [game]: next } }));
}

export function checkCycleChore(
  game: GameId,
  key: string,
  choreId: string,
  checked: boolean,
  now: number,
) {
  return localStore.update((s) => ({
    ...s,
    chores: { ...s.chores, [game]: checkCycle(s.chores[game], now, key, choreId, checked) },
  }));
}
