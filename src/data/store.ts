// The app's single data sync, wired to the network and the local cache, and its React binding.

import { useSyncExternalStore } from "react";
import { logError } from "@/log";
import { readStore, writeStore } from "@/storage";
import { createDataSync, REFRESH_INTERVAL_MS } from "./sync";

// Test builds of the app (mode app-e2e) read a copy shipped with them (vite.config.ts). The mode
// check keeps a stray VITE_DATA_URL in the environment from reaching a release build.
const DATA_URL =
  import.meta.env.MODE === "app-e2e" && import.meta.env.VITE_DATA_URL
    ? import.meta.env.VITE_DATA_URL
    : "https://dev1f965x.github.io/4ghz/data/v1.json";

const dataSync = createDataSync({
  url: DATA_URL,
  fetch: (input, init) => fetch(input, init),
  readCache: () => readStore("data-cache"),
  writeCache: (contents) => writeStore("data-cache", contents),
  now: Date.now,
  logError,
});

/** Loads the cache, downloads, and refreshes every 30 minutes. */
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
