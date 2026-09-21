import { load } from "@tauri-apps/plugin-store";
import type { DailyRecords } from "../domain/dailies";

export interface DailyRecordsMemory {
  load(): Promise<DailyRecords | undefined>;
  save(records: DailyRecords): Promise<void>;
}

const RECORDS_FILE = "records.json";
const DAILIES_KEY = "dailies";

/** Beside the used codes, in the app data folder and nowhere else (ADR 12). */
export const storeDailyRecords: DailyRecordsMemory = {
  async load() {
    const store = await load(RECORDS_FILE, { autoSave: false });
    return store.get<DailyRecords>(DAILIES_KEY);
  },

  async save(records) {
    const store = await load(RECORDS_FILE, { autoSave: false });
    await store.set(DAILIES_KEY, records);
    await store.save();
  },
};
