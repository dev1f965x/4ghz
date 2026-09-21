import type { UsedCodesMemory } from "../codes/usedCodes";

/** A player who has used no codes, and whose marks go nowhere. */
export const noUsedCodes: UsedCodesMemory = {
  load: async () => [],
  save: async () => {},
};
