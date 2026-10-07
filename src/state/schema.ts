// state.json, the user's settings and history (Design Doc, "Local data"). Each story adds the
// fields it needs. Until the first release nothing has been shipped, so v1 still grows; after it,
// any added or changed field bumps schemaVersion with a migration in load.ts, because an older
// app would strip unknown keys and lose them on its next save.
import { z } from "@/data/zod";
import { locales } from "@/i18n/locale";
import { regions } from "@/time/clock";
import { emptyGameDays } from "@/time/days";

export const gameIds = ["genshin", "hsr", "zzz"] as const;
export type GameId = (typeof gameIds)[number];
export const tabIds = ["schedule", "codes", "calendar"] as const;
export type TabId = (typeof tabIds)[number];

export const LOCAL_STATE_VERSION = 1;

const checks = z.record(z.string(), z.record(z.string(), z.number()));
// The fields of GameDays (src/time/days.ts), plus checks of weekly and periodic cycles keyed
// "weekly:<Monday label>" or "period:<period id>", each choreId -> checkedAt.
const gameChores = z.object({
  initialized: z.boolean(),
  firstSeen: z.record(z.string(), z.number()),
  countFrom: z.number().nullable(),
  lastFixedLabel: z.string().nullable(),
  lastAdvancedAt: z.number(),
  days: z.record(
    z.string(),
    z.object({ result: z.enum(["done", "not-done", "untracked"]), fixedAt: z.number() }),
  ),
  dailyChecks: checks,
  cycleChecks: checks,
  /** When the app first saw each checked cycle as ended; retention counts from here. */
  cycleEndedAt: z.record(z.string(), z.number()).default(() => ({})),
});

const gameSettings = z.object({ plays: z.boolean(), region: z.enum(regions) });
const overrides = z.record(z.string(), z.boolean());

function defaultGameSettings() {
  const asia = () => ({ plays: true, region: "asia" as const });
  return { genshin: asia(), hsr: asia(), zzz: asia() };
}

export const localStateSchema = z.object({
  schemaVersion: z.literal(LOCAL_STATE_VERSION),
  settings: z.object({
    lastGame: z.enum(gameIds),
    lastTab: z.enum(tabIds),
    /** The first-run notice to check the server and games (PRD Q9). */
    firstRunNoticeDismissed: z.boolean(),
    /** Only an explicit choice is stored; without one the Windows language applies (PRD FR4). */
    // An unknown value, such as a language a later version adds, falls back to Windows.
    locale: z.enum(locales).optional().catch(undefined),
    /** The release whose update notice the user dismissed (PRD Q8). */
    dismissedUpdateVersion: z.string().optional(),
    /** Whether the user plays each game and on which server (PRD Q1, Q2). */
    games: z
      .object({ genshin: gameSettings, hsr: gameSettings, zzz: gameSettings })
      .default(() => defaultGameSettings()),
    /** Chores turned on or off by the user, by id; others follow enabledByDefault. */
    choreOverrides: z
      .object({ genshin: overrides, hsr: overrides, zzz: overrides })
      .default(() => ({ genshin: {}, hsr: {}, zzz: {} })),
  }),
  /**
   * Codes the user marked as redeemed, by game (PRD Q4). Pre-release fields added after the
   * first state.json default when missing, so earlier files stay valid instead of read-only.
   */
  redeemedCodes: z
    .object({ genshin: z.array(z.string()), hsr: z.array(z.string()), zzz: z.array(z.string()) })
    .default(() => noRedeemedCodes()),
  /** Day history and checks per game (Design Doc, "Time and reset logic"). */
  chores: z
    .object({ genshin: gameChores, hsr: gameChores, zzz: gameChores })
    .default(() => noChores()),
});

export type LocalState = z.infer<typeof localStateSchema>;
export type GameChores = LocalState["chores"][GameId];

function noChores(): LocalState["chores"] {
  return { genshin: emptyGameChores(), hsr: emptyGameChores(), zzz: emptyGameChores() };
}

export function emptyGameChores(): GameChores {
  return { ...emptyGameDays(), cycleChecks: {}, cycleEndedAt: {} };
}

/** Upper-case codes per game; a fresh object each time, so states never share arrays. */
function noRedeemedCodes(): { genshin: string[]; hsr: string[]; zzz: string[] } {
  return { genshin: [], hsr: [], zzz: [] };
}

export function defaultLocalState(): LocalState {
  return {
    schemaVersion: LOCAL_STATE_VERSION,
    settings: {
      lastGame: "genshin",
      lastTab: "schedule",
      firstRunNoticeDismissed: false,
      games: defaultGameSettings(),
      choreOverrides: { genshin: {}, hsr: {}, zzz: {} },
    },
    redeemedCodes: noRedeemedCodes(),
    chores: noChores(),
  };
}
