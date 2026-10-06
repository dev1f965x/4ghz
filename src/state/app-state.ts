// The app's single local store, wired to state.json, and its React binding.
import { useSyncExternalStore } from "react";
import { readStore, writeStore } from "@/storage";
import type { GameId, LocalState } from "./schema";
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
