// The app's single data sync, wired to the network and the local cache, and its React binding.
import { useSyncExternalStore } from "react";
import { readStore, writeStore } from "@/storage";
import { createDataSync, REFRESH_INTERVAL_MS } from "./sync";

// Test builds of the app point at a copy shipped with them (vite.config.ts); release builds
// always use GitHub Pages.
const DATA_URL = import.meta.env.VITE_DATA_URL ?? "https://dev1f965x.github.io/4ghz/data/v1.json";

const dataSync = createDataSync({
  url: DATA_URL,
  fetch: (input, init) => fetch(input, init),
  readCache: () => readStore("data-cache"),
  writeCache: (contents) => writeStore("data-cache", contents),
  now: Date.now,
  // No log file exists yet; the console reaches the WebView2 developer tools.
  logError: (message, error) => console.error(message, error),
});

/** Loads the cache, downloads, and refreshes every 30 minutes (Design Doc, "Data file"). */
export function startDataSync() {
  void dataSync.start();
  setInterval(() => void dataSync.refresh(), REFRESH_INTERVAL_MS);
}

export function refreshData() {
  return dataSync.refresh();
}

export function useDataSync() {
  return useSyncExternalStore(dataSync.subscribe, dataSync.getState);
}
