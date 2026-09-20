import { useEffect, useMemo, useState } from "react";
import type { FeedCache, FeedSource } from "./ports";
import { FeedSync, type SyncState } from "./sync";

/** Runs one sync loop for the lifetime of the window and reports what it is doing. */
export function useFeedSync(source: FeedSource, cache: FeedCache) {
  const sync = useMemo(() => new FeedSync(source, cache), [source, cache]);
  const [state, setState] = useState<SyncState>({ status: "loading" });

  useEffect(() => {
    const unsubscribe = sync.subscribe(setState);
    void sync.start();

    return () => {
      unsubscribe();
      sync.stop();
    };
  }, [sync]);

  return { state, refresh: () => void sync.refresh() };
}
