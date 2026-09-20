import type { Feed, FeedProblem } from "../domain/feed";

/**
 * What the sync loop needs from the outside world.
 *
 * Both sides are interfaces so the loop can be tested without a network, a disk, or a
 * running Tauri shell; the real implementations live next door in `tauri.ts`.
 */
export interface FeedSource {
  fetch(): Promise<FetchOutcome>;
}

export type FetchOutcome =
  | { readonly ok: true; readonly feed: Feed }
  | { readonly ok: false; readonly problem: FeedProblem | { kind: "offline"; detail: string } };

/** The last good feed, kept so the window has something to show before the first fetch. */
export interface FeedCache {
  read(): Promise<CachedFeed | undefined>;
  write(cached: CachedFeed): Promise<void>;
}

export interface CachedFeed {
  feed: Feed;
  fetchedAt: Date;
}
