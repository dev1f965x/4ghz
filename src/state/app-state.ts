// The app's single local store, wired to state.json, and its React binding.
import { useSyncExternalStore } from "react";
import {
  advanceChores,
  advanceNeedsSave,
  changeGameRegion,
  checkCycle,
  checkDaily,
  type GamePrefs,
} from "@/chores/model";
import type { DataFile } from "@/data/classify";
import { readStore, writeStore } from "@/storage";
import type { Region } from "@/time/clock";
import { type GameId, gameIds, type LocalState } from "./schema";
import { createLocalStore } from "./store";

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

/** The current state outside React, such as at startup. */
export function getLocalState() {
  return localStore.getSnapshot().state;
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
    gameIds.map((g) => [
      g,
      advanceChores(data.games[g], state.chores[g], gamePrefs(state, g), now),
    ]),
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
    gamePrefs(state, game),
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
  const next = checkCycle(
    data.games[game],
    state.chores[game],
    gamePrefs(state, game),
    now,
    key,
    choreId,
    checked,
  );
  if (next === null) return false;
  void localStore.update((s) => ({ ...s, chores: { ...s.chores, [game]: next } }));
  return true;
}

/** A game's settings in the shape the chore and calendar models take. */
export function gamePrefs(state: LocalState, game: GameId): GamePrefs {
  const { plays, region } = state.settings.games[game];
  return { plays, region, overrides: state.settings.choreOverrides[game] };
}

export function allPrefs(state: LocalState): Record<GameId, GamePrefs> {
  return Object.fromEntries(gameIds.map((g) => [g, gamePrefs(state, g)])) as Record<
    GameId,
    GamePrefs
  >;
}

/**
 * Days that ended under the old settings are fixed with them before a setting changes, so a
 * change never rewrites past days (PRD FR34). Without data nothing can be fixed yet.
 */
function advanceBeforeChange(data: DataFile | null, now: number) {
  if (data !== null) advanceAllChores(data, now);
}

/** Turns a game on or off in "games I play" (PRD Q2). */
export function setPlays(data: DataFile | null, game: GameId, plays: boolean, now: number) {
  advanceBeforeChange(data, now);
  return localStore.update((s) => ({
    ...s,
    settings: {
      ...s.settings,
      games: { ...s.settings.games, [game]: { ...s.settings.games[game], plays } },
    },
  }));
}

/** Turns a chore on or off; today's result follows at once (PRD FR34). */
export function setChoreEnabled(
  data: DataFile | null,
  game: GameId,
  choreId: string,
  enabled: boolean,
  now: number,
) {
  advanceBeforeChange(data, now);
  return localStore.update((s) => ({
    ...s,
    settings: {
      ...s.settings,
      choreOverrides: {
        ...s.settings.choreOverrides,
        [game]: { ...s.settings.choreOverrides[game], [choreId]: enabled },
      },
    },
  }));
}

/** What a server change would do, for the confirmation (PRD Q1). */
export function previewRegionChange(data: DataFile, game: GameId, region: Region, now: number) {
  const { state } = localStore.getSnapshot();
  return changeGameRegion(
    data.games[game],
    state.chores[game],
    gamePrefs(state, game),
    region,
    now,
  );
}

export function setRegion(data: DataFile, game: GameId, region: Region, now: number) {
  advanceBeforeChange(data, now);
  const { next } = previewRegionChange(data, game, region, now);
  return localStore.update((s) => ({
    ...s,
    chores: { ...s.chores, [game]: next },
    settings: {
      ...s.settings,
      games: { ...s.settings.games, [game]: { ...s.settings.games[game], region } },
    },
  }));
}
