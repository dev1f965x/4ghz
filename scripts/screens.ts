import { mkdirSync, rmSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { createServer } from "vite";
import { type Stores, tauriStandIn } from "../e2e/tauri";

/**
 * Photographs every tab and state of the window, for design review and the README.
 *
 * The interface is a web page drawn by WebView2, which is Chromium, so Edge renders it
 * the same way. Tauri's IPC is answered by a stand-in that keeps the store in memory,
 * which lets each shot start from the records it needs. The clock is pinned so the
 * countdowns in the sample feed read the same every time.
 *
 *   npm run screens        → screens/*.png
 */

/** The window's default size, and the smallest it can be dragged to. */
const WINDOW = { width: 920, height: 640 };
const SMALLEST = { width: 560, height: 420 };
const NOW = new Date("2026-09-21T21:00:00+09:00");
const PORT = 1430;
const OUT = "screens";

interface Shot {
  name: string;
  stores?: Stores;
  act?: (page: Page) => Promise<void>;
  viewport?: { width: number; height: number };
  /** Query string for the page, such as a pretend release waiting to install. */
  query?: string;
}

const tourSeen: Stores = { "settings.json": { "tour-seen": true } };

const everything = {
  genshin: ["commissions", "resin"],
  starrail: ["training", "power"],
  zenless: ["activity", "battery"],
};

/** A week of mixed days: two perfect, the rest partial, today half done. */
const dailies = {
  games: ["genshin", "starrail", "zenless"],
  done: {
    "2026-09-14": { genshin: everything.genshin },
    "2026-09-15": everything,
    "2026-09-16": { genshin: everything.genshin, starrail: everything.starrail },
    "2026-09-17": everything,
    "2026-09-18": { zenless: everything.zenless },
    "2026-09-19": { genshin: everything.genshin, starrail: everything.starrail },
    "2026-09-20": everything,
    "2026-09-21": { genshin: ["commissions"], zenless: everything.zenless },
  },
};

const withDailies: Stores = { ...tourSeen, "records.json": { dailies } };

const tab = (name: string) => (page: Page) => page.getByRole("tab", { name }).click();

const SHOTS: Shot[] = [
  { name: "schedule", stores: tourSeen },
  { name: "codes", stores: tourSeen, act: tab("리딤 코드") },
  {
    name: "codes-used",
    stores: {
      ...tourSeen,
      "records.json": { "used-codes": ["genshin:GENSHINGIFT"] },
    },
    act: tab("리딤 코드"),
  },
  { name: "dailies", stores: withDailies, act: tab("숙제") },
  {
    name: "dailies-one-off",
    stores: {
      ...tourSeen,
      "records.json": { dailies: { ...dailies, games: ["genshin", "zenless"] } },
    },
    act: tab("숙제"),
  },
  {
    name: "filter-menu",
    stores: tourSeen,
    act: (page) => page.getByRole("button", { name: /^게임:/ }).click(),
  },
  {
    name: "filter-zenless",
    stores: { "settings.json": { "tour-seen": true, "game-filter": "zenless" } },
  },
  {
    name: "filter-starrail-dailies",
    stores: {
      "settings.json": { "tour-seen": true, "game-filter": "starrail" },
      "records.json": { dailies },
    },
    act: tab("숙제"),
  },
  {
    name: "filter-genshin-codes",
    stores: { "settings.json": { "tour-seen": true, "game-filter": "genshin" } },
    act: tab("리딤 코드"),
  },
  ...[1, 2, 3, 4].map((step) => ({
    name: `tour-${step}`,
    act: async (page: Page) => {
      await page.getByRole("dialog").waitFor();
      for (let next = 1; next < step; next++)
        await page.getByRole("button", { name: "다음" }).click();
    },
  })),
  { name: "update", stores: tourSeen, query: "?update=1.3.0" },
  {
    name: "update-installing",
    stores: tourSeen,
    query: "?update=1.3.0",
    act: (page) => page.getByRole("button", { name: "업데이트" }).click(),
  },
  { name: "update-dailies", stores: withDailies, query: "?update=1.3.0", act: tab("숙제") },
  { name: "small-schedule", stores: tourSeen, viewport: SMALLEST },
  { name: "small-update", stores: tourSeen, viewport: SMALLEST, query: "?update=1.3.0" },
  {
    name: "small-update-installing",
    stores: tourSeen,
    viewport: SMALLEST,
    query: "?update=1.3.0",
    act: (page) => page.getByRole("button", { name: "업데이트" }).click(),
  },
  { name: "small-codes", stores: tourSeen, viewport: SMALLEST, act: tab("리딤 코드") },
  { name: "small-dailies", stores: withDailies, viewport: SMALLEST, act: tab("숙제") },
];

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({
    server: { port: PORT, strictPort: true },
    logLevel: "error",
  });
  await server.listen();
  const browser = await chromium.launch({ channel: "msedge" });

  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage({
        viewport: shot.viewport ?? WINDOW,
        deviceScaleFactor: 2,
      });
      await page.clock.setFixedTime(NOW);
      await page.addInitScript({ content: tauriStandIn(shot.stores ?? {}) });
      await page.goto(`http://localhost:${PORT}/${shot.query ?? ""}`);
      await page.getByRole("tablist").waitFor();
      await shot.act?.(page);
      // Park the pointer where nothing reacts to it, so no hover state is photographed.
      await page.mouse.move(1, (shot.viewport ?? WINDOW).height - 1);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${shot.name}.png` });
      await page.close();
      console.log(`${OUT}/${shot.name}.png`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
