// The result of the startup update check, shared with the banners.
import { useSyncExternalStore } from "react";
import { logError } from "@/log";
import { fetchJson, findUpdate, type Release } from "./check";

let release: Release | null = null;
const listeners = new Set<() => void>();

/** Checks once; a failure is logged and shows nothing. */
export function startUpdateCheck() {
  findUpdate(__APP_VERSION__, fetchJson)
    .then(
      (found) => {
        release = found;
        for (const listener of listeners) listener();
      },
      (error: unknown) => logError("Checking for a new version failed", error),
    )
    // Lets tests and the smoke test tell a finished check from one still running.
    .finally(() => {
      document.documentElement.dataset.updateCheck = "done";
    });
}

export function useAvailableUpdate() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => release,
  );
}
