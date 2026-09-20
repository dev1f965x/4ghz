import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import type { FeedCache, FeedSource } from "./feed/ports";
import { memoryFeedCache, sampleFeedSource } from "./feed/sample";
import { httpFeedSource, storeFeedCache } from "./feed/tauri";
import { useFeedSync } from "./feed/useFeedSync";

const [source, cache]: [FeedSource, FeedCache] = import.meta.env.DEV
  ? [sampleFeedSource, memoryFeedCache]
  : [httpFeedSource, storeFeedCache];

function Window() {
  const { state, refresh } = useFeedSync(source, cache);
  return <App state={state} onRefresh={refresh} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Window />
  </React.StrictMode>,
);
