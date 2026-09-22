import type { Page } from "@playwright/test";
import { type Stores, tauriStandIn } from "./tauri";

/** 21:00 in Korea on Monday 21 September 2026, against the sample feed's dates. */
export const NOW = new Date("2026-09-21T21:00:00+09:00");

export const SEEN_TOUR: Stores = { "settings.json": { "tour-seen": true } };

/**
 * Opens the window with the clock at `NOW` and the store holding `stores`. `query` reaches
 * the development stand-ins, such as `?update=1.3.0` for a release waiting to install.
 */
export async function openApp(page: Page, stores: Stores = SEEN_TOUR, query = "") {
  await page.clock.install({ time: NOW });
  await page.addInitScript({ content: tauriStandIn(stores) });
  await page.goto(`/${query}`);
  await page.getByRole("tablist").waitFor();
}

/** What the app wrote under `key` in the store file `file`. */
export function stored(page: Page, file: string, key: string) {
  return page.evaluate(
    ([file, key]) => (window as unknown as { __stores: Stores }).__stores[file]?.[key],
    [file, key],
  );
}

/** Every IPC call the app made with this command, oldest first. */
export function invoked(page: Page, command: string) {
  return page.evaluate(
    (command) =>
      (window as unknown as { __invokes: { command: string; args: unknown }[] }).__invokes
        .filter((call) => call.command === command)
        .map((call) => call.args),
    command,
  );
}
