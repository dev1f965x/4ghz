import { dataFile, expect, expectNoA11yViolations, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const status = (app: import("@playwright/test").Page) => app.locator("[data-sync-status]");
const cached = JSON.stringify({ savedAt: Date.now() - 3_600_000, file: dataFile });
const retired = { schemaVersion: 1, retired: true, updatedAt: "2027-01-01T00:00:00+09:00" };

test("downloads the data file, shows it as updated, and caches it", async ({ app }) => {
  await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
  await expect(app.getByRole("status").first()).toHaveText(/방금 업데이트됨|Updated just now/);
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
    const retry = app.getByRole("button", { name: /다시 시도|Try again/ });
    await expect(retry).toBeVisible();
    await expectNoA11yViolations(app);
    network.serve({ json: dataFile });
    await retry.click();
    await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
    await expect(retry).toBeHidden();
  });
});

test.describe("offline with a cached copy", () => {
  test.use({ dataResponse: "offline", localFiles: { "data-cache": cached } });

  test("keeps the cached data and warns that it may be out of date", async ({ app }) => {
    await expect(status(app)).toHaveAttribute("data-sync-status", "failed");
    await expect(
      app.getByText(/데이터가 오래됐을 수 있습니다|Data may be out of date/),
    ).toBeVisible();
    await expect(app.getByRole("button", { name: /다시 시도|Try again/ })).toBeHidden();
    await expectNoA11yViolations(app);
  });
});

test.describe("a retired data file", () => {
  test.use({ dataResponse: { json: retired }, localFiles: { "data-cache": cached } });

  test("keeps the last valid copy and asks for an app update", async ({ app }) => {
    await expect(app.getByText(/앱을 업데이트하세요|Update the app/).first()).toBeVisible();
    await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
  });
});

test("F5 refreshes the data instead of reloading the window", async ({ app, network }) => {
  await expect(status(app)).toHaveAttribute("data-sync-status", "ok");
  network.serve("offline");
  await app.keyboard.press("F5");
  await expect(status(app)).toHaveAttribute("data-sync-status", "failed");
});
