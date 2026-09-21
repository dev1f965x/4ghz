import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import type { FeedCache, FeedSource } from "./feed/ports";
import { memoryFeedCache, sampleFeedSource } from "./feed/sample";
import { httpFeedSource, storeFeedCache } from "./feed/tauri";
import { useFeedSync } from "./feed/useFeedSync";
import { storeTourMemory } from "./onboarding/memory";
import type { UpdateSource } from "./update/ports";
import { alwaysCurrent, tauriUpdateSource } from "./update/tauri";
import { useUpdate } from "./update/useUpdate";

const [source, cache]: [FeedSource, FeedCache] = import.meta.env.DEV
  ? [sampleFeedSource, memoryFeedCache]
  : [httpFeedSource, storeFeedCache];
const updates: UpdateSource = import.meta.env.DEV ? alwaysCurrent : tauriUpdateSource;

function Window() {
  const { state, refresh } = useFeedSync(source, cache);
  const { update, install } = useUpdate(updates);
  return (
    <App
      state={state}
      onRefresh={refresh}
      tourMemory={storeTourMemory}
      update={update}
      onInstallUpdate={() => void install()}
    />
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Window />
  </React.StrictMode>,
);
