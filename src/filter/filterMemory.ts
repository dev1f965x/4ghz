import { load } from "@tauri-apps/plugin-store";
import type { GameFilter } from "../domain/filter";

/** Which game the window was looking at, across restarts. */
export interface FilterMemory {
  load(): Promise<unknown>;
  save(filter: GameFilter): Promise<void>;
}

const SETTINGS_FILE = "settings.json";
const FILTER_KEY = "game-filter";

export const storeFilterMemory: FilterMemory = {
  async load() {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    return store.get(FILTER_KEY);
  },

  async save(filter) {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    await store.set(FILTER_KEY, filter);
    await store.save();
  },
};
