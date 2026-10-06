// Keeps the last valid data file and refreshes it (PRD FR8 to FR12): the cached copy shows at once
// at startup, then the network copy replaces it if it is valid. Any failure keeps the last valid
// copy. I/O is injected, so every outcome is unit-tested without a network or Tauri.
import { classify, type DataFile } from "./classify";

/** Why the latest download was not used, while the last valid copy stays in use. */
type Problem = "invalid" | "retired" | "unsupported";

export type SyncState = {
  /** The last valid data file, or null before one is available. */
  data: DataFile | null;
  /** loading: a download is in progress; ok: the latest download arrived; failed: it did not. */
  status: "loading" | "ok" | "failed";
  /** When the data in use was downloaded, from the cache or the network; null without data. */
  checkedAt: number | null;
  problem: Problem | null;
};

export type SyncDeps = {
  url: string;
  fetch: typeof fetch;
  readCache: () => Promise<string | null>;
  writeCache: (contents: string) => Promise<void>;
  now: () => number;
  /** Reports errors the user cannot act on, such as a failed cache write. */
  logError: (message: string, error: unknown) => void;
};

/** What data-cache.json holds: the last valid file and when it was downloaded. */
type CacheEntry = { savedAt: number; file: unknown };

// A refresh that hangs must not keep the sync unit in "loading" forever.
const TIMEOUT_MS = 15_000;
export const REFRESH_INTERVAL_MS = 30 * 60_000;

export function createDataSync(deps: SyncDeps) {
  let state: SyncState = { data: null, status: "loading", checkedAt: null, problem: null };
  const listeners = new Set<() => void>();
  let inFlight: Promise<void> | null = null;

  const set = (patch: Partial<SyncState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  async function loadCache() {
    let text: string | null;
    try {
      text = await deps.readCache();
    } catch (error) {
      // Without a readable cache the app still works from the network.
      deps.logError("Reading the data cache failed", error);
      return;
    }
    if (text === null) return;
    let entry: CacheEntry | null;
    try {
      entry = JSON.parse(text) as CacheEntry | null;
    } catch (error) {
      deps.logError("The data cache could not be read", error);
      return;
    }
    const result = classify(entry?.file);
    if (result.kind !== "valid" || typeof entry?.savedAt !== "number") {
      // For example a file a newer app version cached before a downgrade.
      deps.logError("The data cache is not usable", result.kind);
      return;
    }
    // A download that already finished is newer than the cache.
    if (state.data === null) set({ data: result.file, checkedAt: entry.savedAt });
  }

  async function download() {
    set({ status: "loading" });
    let json: unknown;
    try {
      const response = await deps.fetch(deps.url, {
        // Revalidate with GitHub Pages instead of reusing a stale browser copy.
        cache: "no-cache",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      json = await response.json();
    } catch (error) {
      deps.logError("Downloading the data file failed", error);
      set({ status: "failed" });
      return;
    }
    const at = deps.now();
    const result = classify(json);
    if (result.kind !== "valid") {
      if (result.kind === "invalid") deps.logError("The data file is invalid", result.issues);
      // checkedAt stays the time of the data in use, which this file does not replace.
      set({ status: "ok", problem: result.kind });
      return;
    }
    set({ status: "ok", data: result.file, checkedAt: at, problem: null });
    try {
      await deps.writeCache(JSON.stringify({ savedAt: at, file: json } satisfies CacheEntry));
    } catch (error) {
      // The data is in use; only the next offline start would miss it.
      deps.logError("Saving the data cache failed", error);
    }
  }

  /** Downloads now; a refresh already running is shared instead of started twice. */
  function refresh() {
    inFlight ??= download().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Shows the cached copy first, then downloads. */
    async start() {
      await loadCache();
      await refresh();
    },
    refresh,
  };
}
