import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Feed } from "../domain/feed";
import type { CachedFeed, FeedCache, FeedSource, FetchOutcome } from "./ports";
import { FeedSync, RETRY_DELAYS_MS, type SyncState } from "./sync";

const feed: Feed = {
  schemaVersion: "1.0",
  publishedAt: new Date("2026-09-20T00:00:00Z"),
  events: [],
};

const offline = { ok: false, problem: { kind: "offline", detail: "no network" } } as const;

function sourceReturning(...outcomes: FetchOutcome[]): FeedSource & { calls: number } {
  const source = {
    calls: 0,
    async fetch() {
      const outcome = outcomes[Math.min(source.calls, outcomes.length - 1)];
      source.calls += 1;
      return outcome;
    },
  };
  return source;
}

function emptyCache(seed?: CachedFeed): FeedCache & { written?: CachedFeed } {
  const cache: FeedCache & { written?: CachedFeed } = {
    async read() {
      return seed;
    },
    async write(cached) {
      cache.written = cached;
    },
  };
  return cache;
}

function track(sync: FeedSync): SyncState[] {
  const states: SyncState[] = [];
  sync.subscribe((state) => states.push(state));
  return states;
}

describe("FeedSync", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows the cached schedule before the network answers", async () => {
    const cached = { feed, fetchedAt: new Date("2026-09-30T00:00:00Z") };
    const sync = new FeedSync(sourceReturning({ ok: true, feed }), emptyCache(cached));
    const states = track(sync);

    await sync.start();

    expect(states.map((state) => state.status)).toEqual(["loading", "ready", "ready", "ready"]);
    expect(states[1]).toMatchObject({ cached, refreshing: true });
    sync.stop();
  });

  it("stores what it fetched", async () => {
    const cache = emptyCache();
    const sync = new FeedSync(
      sourceReturning({ ok: true, feed }),
      cache,
      () => new Date("2026-10-01T12:00:00Z"),
    );

    await sync.start();

    expect(cache.written).toEqual({ feed, fetchedAt: new Date("2026-10-01T12:00:00Z") });
    sync.stop();
  });

  it("retries a failure three times before giving up", async () => {
    const source = sourceReturning(offline);
    const sync = new FeedSync(source, emptyCache());
    const states = track(sync);

    await sync.start();
    for (const delay of RETRY_DELAYS_MS) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    expect(source.calls).toBe(RETRY_DELAYS_MS.length + 1);
    expect(states.at(-1)).toEqual({ status: "failed", problem: offline.problem });
    sync.stop();
  });

  it("recovers when a retry succeeds", async () => {
    const source = sourceReturning(offline, { ok: true, feed });
    const sync = new FeedSync(source, emptyCache());
    const states = track(sync);

    await sync.start();
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);

    expect(states.at(-1)?.status).toBe("ready");
    sync.stop();
  });

  it("keeps the cached schedule on screen when a refresh fails", async () => {
    const cached = { feed, fetchedAt: new Date("2026-09-30T00:00:00Z") };
    const sync = new FeedSync(sourceReturning(offline), emptyCache(cached));
    const states = track(sync);

    await sync.start();
    for (const delay of RETRY_DELAYS_MS) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    expect(states.at(-1)).toMatchObject({
      status: "ready",
      cached,
      refreshing: false,
      lastProblem: offline.problem,
    });
    sync.stop();
  });

  it("stops fetching once stopped", async () => {
    const source = sourceReturning({ ok: true, feed });
    const sync = new FeedSync(source, emptyCache());

    await sync.start();
    sync.stop();
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);

    expect(source.calls).toBe(1);
  });
});
