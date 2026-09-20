import { load } from "@tauri-apps/plugin-store";
import type { TourMemory } from "./useTour";

const SETTINGS_FILE = "settings.json";
const SEEN_KEY = "tour-seen";

/** Keeps the "already shown" mark beside the other settings in the app data folder. */
export const storeTourMemory: TourMemory = {
  async seen(): Promise<boolean> {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    return (await store.get<boolean>(SEEN_KEY)) ?? false;
  },

  async markSeen(): Promise<void> {
    const store = await load(SETTINGS_FILE, { autoSave: false });
    await store.set(SEEN_KEY, true);
    await store.save();
  },
};
