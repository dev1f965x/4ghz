import type { UsedCodesMemory } from "../codes/usedCodes";
import type { DailyRecordsMemory } from "../dailies/dailyRecords";

/** A player who has used no codes, and whose marks go nowhere. */
export const noUsedCodes: UsedCodesMemory = {
  load: async () => [],
  save: async () => {},
};

/** A first run: every game picked, nothing done, and changes kept nowhere. */
export const noDailies: DailyRecordsMemory = {
  load: async () => undefined,
  save: async () => {},
};
