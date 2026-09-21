import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";
import { createServer } from "vite";

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

const WINDOW = { width: 920, height: 640 };
const NOW = new Date("2026-09-21T21:00:00+09:00");
const PORT = 1430;
const OUT = "screens";

type Stores = Record<string, Record<string, unknown>>;

interface Shot {
  name: string;
  stores?: Stores;
  act?: (page: Page) => Promise<void>;
}

const tourSeen: Stores = { "settings.json": { "tour-seen": true } };

const finishedDays = ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-19", "2026-09-20"];
const dailies = {
  games: ["genshin", "starrail", "zenless"],
  done: Object.fromEntries([
    ...finishedDays.map((day) => [
      day,
      { genshin: ["commissions", "resin"], starrail: ["training", "power"] },
    ]),
    ["2026-09-21", { genshin: ["commissions"], zenless: ["activity", "battery"] }],
  ]),
};

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
  { name: "dailies", stores: { ...tourSeen, "records.json": { dailies } }, act: tab("숙제") },
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
  { name: "tour" },
];

/**
 * Answers the IPC calls the window makes, with each store file kept in memory. Written as
 * plain JavaScript text: it runs in the page, where the helpers a TypeScript transform
 * would add do not exist.
 */
function tauriStandIn(stores: Stores): string {
  return `(() => {
    const data = ${JSON.stringify(stores)};
    const files = new Map();
    let next = 1;
    const invoke = async (command, args = {}) => {
      if (command === "plugin:store|load") {
        data[args.path] ??= {};
        files.set(next, args.path);
        return next++;
      }
      const file = data[files.get(args.rid)] ?? {};
      if (command === "plugin:store|get") return [file[args.key] ?? null, args.key in file];
      if (command === "plugin:store|set") file[args.key] = args.value;
      return null;
    };
    window.__TAURI_INTERNALS__ = {
      invoke,
      transformCallback: () => 0,
      metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
    };
  })();`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: "error" });
  await server.listen();
  const browser = await chromium.launch({ channel: "msedge" });

  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage({ viewport: WINDOW, deviceScaleFactor: 2 });
      await page.clock.setFixedTime(NOW);
      await page.addInitScript({ content: tauriStandIn(shot.stores ?? {}) });
      await page.goto(`http://localhost:${PORT}`);
      await page.getByRole("tablist").waitFor();
      await shot.act?.(page);
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
