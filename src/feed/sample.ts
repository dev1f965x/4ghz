import sampleFeed from "../../feed/events.sample.json";
import { parseFeed } from "../domain/feed";
import type { CachedFeed, FeedCache, FeedSource, FetchOutcome } from "./ports";

/**
 * Stands in for the network while developing, so `npm run tauri dev` shows a full window
 * without publishing a feed first. Vite drops this from release builds.
 */
export const sampleFeedSource: FeedSource = {
  async fetch(): Promise<FetchOutcome> {
    const parsed = parseFeed(sampleFeed);
    return parsed.ok ? { ok: true, feed: parsed.feed } : { ok: false, problem: parsed.problem };
  },
};

export const memoryFeedCache: FeedCache = {
  async read(): Promise<CachedFeed | undefined> {
    return undefined;
  },
  async write(): Promise<void> {},
};
