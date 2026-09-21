import { load } from "@tauri-apps/plugin-store";

/** Codes the player has marked as used, by `codeKey`. */
export interface UsedCodesMemory {
  load(): Promise<string[]>;
  save(keys: string[]): Promise<void>;
}

const RECORDS_FILE = "records.json";
const USED_CODES_KEY = "used-codes";

/** Kept with the player's other records, in the app data folder and nowhere else (ADR 12). */
export const storeUsedCodes: UsedCodesMemory = {
  async load() {
    const store = await load(RECORDS_FILE, { autoSave: false });
    return (await store.get<string[]>(USED_CODES_KEY)) ?? [];
  },

  async save(keys) {
    const store = await load(RECORDS_FILE, { autoSave: false });
    await store.set(USED_CODES_KEY, keys);
    await store.save();
  },
};
