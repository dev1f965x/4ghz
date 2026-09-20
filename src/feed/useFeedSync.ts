import { useEffect, useRef, useState } from "react";
import type { FeedCache, FeedSource } from "./ports";
import { FeedSync, type SyncState } from "./sync";

/**
 * Runs one sync loop for as long as the window is mounted.
 *
 * The loop is built inside the effect rather than kept across renders: stopping one is
 * final, and React mounts effects twice in development, so a reused instance would refuse
 * to start the second time and the window would sit on "loading" forever.
 */
export function useFeedSync(source: FeedSource, cache: FeedCache) {
  const [state, setState] = useState<SyncState>({ status: "loading" });
  const running = useRef<FeedSync>(null);

  useEffect(() => {
    const sync = new FeedSync(source, cache);
    running.current = sync;

    const unsubscribe = sync.subscribe(setState);
    void sync.start();

    return () => {
      unsubscribe();
      sync.stop();
      running.current = null;
    };
  }, [source, cache]);

  return { state, refresh: () => void running.current?.refresh() };
}
