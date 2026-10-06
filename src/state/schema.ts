// state.json, the user's settings and history (Design Doc, "Local data"). Each story adds the
// fields it needs. Until the first release nothing has been shipped, so v1 still grows; after it,
// any added or changed field bumps schemaVersion with a migration in load.ts, because an older
// app would strip unknown keys and lose them on its next save.
import { z } from "@/data/zod";

export const gameIds = ["genshin", "hsr", "zzz"] as const;
export type GameId = (typeof gameIds)[number];
export const tabIds = ["schedule", "codes", "calendar"] as const;
export type TabId = (typeof tabIds)[number];

export const LOCAL_STATE_VERSION = 1;

export const localStateSchema = z.object({
  schemaVersion: z.literal(LOCAL_STATE_VERSION),
  settings: z.object({
    lastGame: z.enum(gameIds),
    lastTab: z.enum(tabIds),
    /** The first-run notice to check the server and games (PRD Q9). */
    firstRunNoticeDismissed: z.boolean(),
  }),
  /**
   * Codes the user marked as redeemed, by game (PRD Q4). Pre-release fields added after the
   * first state.json default when missing, so earlier files stay valid instead of read-only.
   */
  redeemedCodes: z
    .object({ genshin: z.array(z.string()), hsr: z.array(z.string()), zzz: z.array(z.string()) })
    .default(() => noRedeemedCodes()),
});

export type LocalState = z.infer<typeof localStateSchema>;

/** Upper-case codes per game; a fresh object each time, so states never share arrays. */
function noRedeemedCodes(): { genshin: string[]; hsr: string[]; zzz: string[] } {
  return { genshin: [], hsr: [], zzz: [] };
}

export function defaultLocalState(): LocalState {
  return {
    schemaVersion: LOCAL_STATE_VERSION,
    settings: { lastGame: "genshin", lastTab: "schedule", firstRunNoticeDismissed: false },
    redeemedCodes: noRedeemedCodes(),
  };
}
