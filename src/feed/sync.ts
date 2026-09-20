import type { CachedFeed, FeedCache, FeedSource, FetchOutcome } from "./ports";

export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const RETRY_DELAYS_MS = [2_000, 8_000, 30_000];

export type SyncState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly cached: CachedFeed;
      readonly refreshing: boolean;
      readonly lastProblem?: FailedFetch;
    }
  | { readonly status: "failed"; readonly problem: FailedFetch };

type FailedFetch = Extract<FetchOutcome, { ok: false }>["problem"];

/** Only a network failure is worth waiting out. A broken or too-new feed stays broken. */
function isTransient(problem: FailedFetch): boolean {
  return problem.kind === "offline";
}

/**
 * Keeps one copy of the schedule fresh.
 *
 * The rules come from the product definition: fetch on start and every six hours, retry a
 * network failure three times with growing delays, and never drop what is already on
 * screen — a stale schedule beats an empty window.
 */
export class FeedSync {
  private state: SyncState = { status: "loading" };
  private listeners = new Set<(state: SyncState) => void>();
  private retryTimer?: ReturnType<typeof setTimeout>;
  private intervalTimer?: ReturnType<typeof setInterval>;
  private attempt = 0;
  private fetching = false;
  private stopped = false;

  constructor(
    private readonly source: FeedSource,
    private readonly cache: FeedCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Shows the cached schedule first, then goes to the network. */
  async start(): Promise<void> {
    const cached = await this.cache.read();
    if (this.stopped) return;
    if (cached) this.publish({ status: "ready", cached, refreshing: true });

    this.intervalTimer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    await this.refresh();
  }

  /** After this the loop is inert: late answers are dropped rather than written. */
  stop(): void {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.intervalTimer);
    this.listeners.clear();
  }

  /**
   * A refresh asked for by the viewer, or by the timer.
   *
   * A second call while one is in flight is ignored rather than queued: two chains would
   * share the retry counter and race to write the cache.
   */
  async refresh(): Promise<void> {
    if (this.fetching || this.stopped) return;

    clearTimeout(this.retryTimer);
    this.attempt = 0;
    this.markRefreshing();
    await this.attemptFetch();
  }

  private async attemptFetch(): Promise<void> {
    if (this.stopped) return;

    this.fetching = true;
    let outcome: FetchOutcome;
    try {
      outcome = await this.source.fetch();
    } finally {
      this.fetching = false;
    }
    if (this.stopped) return;

    if (outcome.ok) {
      const cached = { feed: outcome.feed, fetchedAt: this.now() };
      await this.cache.write(cached);
      if (this.stopped) return;

      this.attempt = 0;
      this.publish({ status: "ready", cached, refreshing: false });
      return;
    }

    const delay = isTransient(outcome.problem) ? RETRY_DELAYS_MS[this.attempt] : undefined;
    if (delay !== undefined) {
      this.attempt += 1;
      this.retryTimer = setTimeout(() => void this.attemptFetch(), delay);
      return;
    }

    this.attempt = 0;
    this.publish(
      this.state.status === "ready"
        ? { ...this.state, refreshing: false, lastProblem: outcome.problem }
        : { status: "failed", problem: outcome.problem },
    );
  }

  private markRefreshing(): void {
    if (this.state.status === "ready") this.publish({ ...this.state, refreshing: true });
  }

  private publish(state: SyncState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
