import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { load } from "@tauri-apps/plugin-store";
import { parseFeed } from "../domain/feed";
import type { CachedFeed, FeedCache, FeedSource, FetchOutcome } from "./ports";

/** Overridable so a build can point at a test feed; the default is what ships. */
export const FEED_URL =
  import.meta.env.VITE_FEED_URL ?? "https://dev1f965x.github.io/4ghz/events.json";

const CACHE_FILE = "feed.json";
const CACHE_KEY = "cached-feed";

/**
 * Reads the feed over the shell's HTTP client rather than the webview's.
 *
 * The request then comes from the app rather than from a page, which keeps it out of
 * CORS and lets the capability file spell out the one host this app may reach.
 */
export const httpFeedSource: FeedSource = {
  async fetch(): Promise<FetchOutcome> {
    try {
      const response = await tauriFetch(FEED_URL, { headers: { accept: "application/json" } });
      if (!response.ok) {
        return { ok: false, problem: { kind: "offline", detail: `HTTP ${response.status}` } };
      }

      const parsed = parseFeed(await response.json());
      return parsed.ok ? { ok: true, feed: parsed.feed } : { ok: false, problem: parsed.problem };
    } catch (error) {
      return { ok: false, problem: { kind: "offline", detail: describe(error) } };
    }
  },
};

/** Keeps the last good feed in the app data directory, beside future settings. */
export const storeFeedCache: FeedCache = {
  async read(): Promise<CachedFeed | undefined> {
    const store = await load(CACHE_FILE, { autoSave: false });
    const raw = await store.get<{ feed: unknown; fetchedAt: string }>(CACHE_KEY);
    if (!raw) return undefined;

    const parsed = parseFeed(raw.feed);
    if (!parsed.ok) return undefined;

    return { feed: parsed.feed, fetchedAt: new Date(raw.fetchedAt) };
  },

  async write(cached: CachedFeed): Promise<void> {
    const store = await load(CACHE_FILE, { autoSave: false });
    await store.set(CACHE_KEY, {
      feed: {
        schemaVersion: cached.feed.schemaVersion,
        publishedAt: cached.feed.publishedAt.toISOString(),
        events: cached.feed.events.map((event) => ({
          ...event,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt?.toISOString(),
        })),
        codes: cached.feed.codes.map((code) => ({
          ...code,
          addedAt: code.addedAt.toISOString(),
          expiresAt: code.expiresAt?.toISOString(),
        })),
        dailies: cached.feed.dailies,
      },
      fetchedAt: cached.fetchedAt.toISOString(),
    });
    await store.save();
  },
};

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
