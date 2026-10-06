import type { Page } from "@playwright/test";
import { dataFile, expect, expectNoA11yViolations, NOW, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const status = (app: Page) => app.locator("[data-sync-status]");
const retry = (app: Page) => app.getByRole("button", { name: /다시 시도|Try again/ });
const staleBanner = (app: Page) =>
  app.getByText(/데이터가 오래됐을 수 있습니다|Data may be out of date/);
const cached = JSON.stringify({ savedAt: NOW - 3_600_000, file: dataFile });
const retired = { schemaVersion: 1, retired: true, updatedAt: "2027-01-01T00:00:00+09:00" };

test("downloads the data file, shows it as updated, and caches it", async ({ app }) => {
  await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
  await expect(status(app)).toContainText(/방금 업데이트됨|Updated just now/);
  const cache = await app.evaluate(() =>
    (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
      "read_store",
      { file: "data-cache" },
    ),
  );
  expect(JSON.parse(cache as string).file).toEqual(dataFile);
});

test.describe("first run without a network", () => {
  test.use({ dataResponse: "offline" });

  test("says data could not be loaded and retries", async ({ app, network }) => {
    await expect(status(app)).toHaveAttribute("data-sync-status", "failed");
    await expect(status(app)).toContainText(/데이터 없음|No data/);
    await expect(retry(app)).toBeVisible();
    await expectNoA11yViolations(app);
    network.serve({ json: dataFile });
    await retry(app).click();
    await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
    await expect(retry(app)).toBeHidden();
  });
});

test.describe("offline with a cached copy", () => {
  test.use({ dataResponse: "offline", localFiles: { "data-cache": cached } });

  test("keeps the cached data, warns that it may be out of date, and retries", async ({
    app,
    network,
  }) => {
    await expect(status(app)).toHaveAttribute("data-sync-status", "failed");
    await expect(staleBanner(app)).toBeVisible();
    // Only the banner's button: the tabs show data, not the could-not-load state.
    await expect(retry(app)).toHaveCount(1);
    await expectNoA11yViolations(app);
    network.serve({ json: dataFile });
    await retry(app).click();
    await expect(staleBanner(app)).toBeHidden();
  });
});

for (const [name, json, text] of [
  ["retired", retired, /앱을 업데이트하세요|Update the app/],
  ["unsupported", { schemaVersion: 2 }, /앱을 업데이트하세요|Update the app/],
  ["invalid", { ...(dataFile as object), games: {} }, /오류가 있습니다|has errors/],
] as const) {
  test.describe(`a ${name} data file`, () => {
    test.describe("with a cached copy", () => {
      test.use({ dataResponse: { json }, localFiles: { "data-cache": cached } });

      test("keeps the last valid copy and says why", async ({ app }) => {
        await expect(app.getByText(text).first()).toBeVisible();
        await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
        // The header keeps the time of the cached copy in use, not "just now".
        await expect(status(app)).not.toContainText(/방금 업데이트됨|Updated just now/);
        await expectNoA11yViolations(app);
      });
    });

    test.describe("on a first run", () => {
      test.use({ dataResponse: { json } });

      test("says why there is no data", async ({ app }) => {
        await expect(app.getByText(text).first()).toBeVisible();
        await expect(status(app)).toContainText(/데이터 없음|No data/);
      });
    });
  });
}

test("F5 refreshes the data instead of reloading the window", async ({ app, network }) => {
  await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
  network.serve("offline");
  await app.keyboard.press("F5");
  await expect(status(app)).toHaveAttribute("data-sync-status", "failed");
  // A reload would have lost the downloaded data and shown the could-not-load state instead.
  await expect(staleBanner(app)).toBeVisible();
  await expect(retry(app)).toHaveCount(1);
});
