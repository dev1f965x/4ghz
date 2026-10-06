// The app's single local store, wired to state.json, and its React binding.
import { useSyncExternalStore } from "react";
import { advanceChores, advanceNeedsSave, checkCycle, checkDaily } from "@/chores/model";
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

// lastAdvancedAt per game as last saved by an advance; null until the first advance.
let savedAdvancedAt: Record<GameId, number> | null = null;

/** Applies resets and missed days to every game (PRD FR28, FR29); writes only real changes. */
export function advanceAllChores(data: DataFile, now: number) {
  const { state } = localStore.getSnapshot();
  const next = Object.fromEntries(
    gameIds.map((g) => [g, advanceChores(data.games[g], state.chores[g], REGION, now)]),
  ) as LocalState["chores"];
  // Starts from the loaded file; every save of the chores below writes all games.
  savedAdvancedAt ??= Object.fromEntries(
    gameIds.map((g) => [g, state.chores[g].lastAdvancedAt]),
  ) as Record<GameId, number>;
  const saved = savedAdvancedAt;
  const save = gameIds.some((g) => advanceNeedsSave(state.chores[g], next[g], saved[g]));
  if (save)
    savedAdvancedAt = Object.fromEntries(gameIds.map((g) => [g, next[g].lastAdvancedAt])) as Record<
      GameId,
      number
    >;
  void localStore.update((s) => ({ ...s, chores: next }), { save });
}

/**
 * Checks or unchecks a daily chore. Returns false when the day closed between drawing the list
 * and the click; the list then shows the day closed on its next render.
 */
export function checkDailyChore(
  data: DataFile,
  game: GameId,
  label: string,
  choreId: string,
  checked: boolean,
  now: number,
) {
  const { state } = localStore.getSnapshot();
  const next = checkDaily(
    data.games[game],
    state.chores[game],
    REGION,
    now,
    label,
    choreId,
    checked,
  );
  if (next === null) return false;
  void localStore.update((s) => ({ ...s, chores: { ...s.chores, [game]: next } }));
  return true;
}

/** Checks or unchecks a weekly or periodic chore; false when cycle `key` has ended. */
export function checkCycleChore(
  data: DataFile,
  game: GameId,
  key: string,
  choreId: string,
  checked: boolean,
  now: number,
) {
  const { state } = localStore.getSnapshot();
  const next = checkCycle(data.games[game], state.chores[game], REGION, now, key, choreId, checked);
  if (next === null) return false;
  void localStore.update((s) => ({ ...s, chores: { ...s.chores, [game]: next } }));
  return true;
}
