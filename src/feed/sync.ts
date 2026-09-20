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

/**
 * Keeps one copy of the schedule fresh.
 *
 * The rules come from the product definition: fetch on start and every six hours, retry a
 * failure three times with growing delays, and never drop what is already on screen —
 * a stale schedule beats an empty window.
 */
export class FeedSync {
  private state: SyncState = { status: "loading" };
  private listeners = new Set<(state: SyncState) => void>();
  private retryTimer?: ReturnType<typeof setTimeout>;
  private intervalTimer?: ReturnType<typeof setInterval>;
  private attempt = 0;

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
    if (cached) this.publish({ status: "ready", cached, refreshing: true });

    this.intervalTimer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    await this.refresh();
  }

  stop(): void {
    clearTimeout(this.retryTimer);
    clearInterval(this.intervalTimer);
    this.listeners.clear();
  }

  /** A refresh asked for by the viewer, or by the timer. */
  async refresh(): Promise<void> {
    clearTimeout(this.retryTimer);
    this.attempt = 0;
    this.markRefreshing();
    await this.attemptFetch();
  }

  private async attemptFetch(): Promise<void> {
    const outcome = await this.source.fetch();

    if (outcome.ok) {
      const cached = { feed: outcome.feed, fetchedAt: this.now() };
      await this.cache.write(cached);
      this.attempt = 0;
      this.publish({ status: "ready", cached, refreshing: false });
      return;
    }

    const delay = RETRY_DELAYS_MS[this.attempt];
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
