import { load } from "@tauri-apps/plugin-store";
import type { Game } from "../domain/event";

/** Which game's colour the window wears, across restarts. */
export interface ThemeMemory {
  load(): Promise<Game | undefined>;
  save(game: Game): Promise<void>;
}

const SETTINGS_FILE = "settings.json";
const THEME_KEY = "theme-game";

export const storeThemeMemory: ThemeMemory = {
  async load() {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    return store.get<Game>(THEME_KEY);
  },

  async save(game) {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    await store.set(THEME_KEY, game);
    await store.save();
  },
};
