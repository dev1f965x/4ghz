import type { Page } from "@playwright/test";
import { dataFile, expect, expectNoA11yViolations, NOW, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const savedState = (settings: object) =>
  JSON.stringify({
    schemaVersion: 1,
    settings: {
      lastGame: "genshin",
      lastTab: "schedule",
      firstRunNoticeDismissed: true,
      ...settings,
    },
  });

async function readState(app: Page) {
  const text = await app.evaluate(() =>
    (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
      "read_store",
      { file: "state" },
    ),
  );
  return text === null
    ? null
    : (JSON.parse(text as string) as { settings: Record<string, unknown> });
}

const firstRunTitle = /서버와 게임을 확인하세요|Check your server and games/;
const settingsButton = (app: Page) => app.getByRole("button", { name: /^(설정|Settings)$/ });

test.describe("a returning user", () => {
  test.use({ localFiles: { state: savedState({ lastGame: "hsr", lastTab: "codes" }) } });

  test("reopens with the last game and tab", async ({ app }) => {
    await expect(app.locator("html")).toHaveAttribute("data-game", "hsr");
    await expect(app.getByRole("tab", { name: /코드|Codes/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(app.getByText(firstRunTitle)).toBeHidden();
  });
});

test("saves the chosen game and tab", async ({ app }) => {
  await app.getByRole("combobox").click();
  await app.getByRole("option").nth(2).click();
  await app.getByRole("tab", { name: /캘린더|Calendar/ }).click();
  await expect
    .poll(async () => (await readState(app))?.settings)
    .toMatchObject({ lastGame: "zzz", lastTab: "calendar" });
});

test("shows the first-run notice until it is dismissed", async ({ app }) => {
  await expect(app.getByText(firstRunTitle)).toBeVisible();
  await expectNoA11yViolations(app);
  await app
    .getByRole("button", { name: /서버 확인 알림 닫기|Dismiss the server and games notice/ })
    .click();
  await expect(app.getByText(firstRunTitle)).toBeHidden();
  await expect
    .poll(async () => (await readState(app))?.settings.firstRunNoticeDismissed)
    .toBe(true);
});

test("opens Settings from the first-run notice, which stays until dismissed", async ({ app }) => {
  await app.getByRole("button", { name: /설정 열기|Open settings/ }).click();
  await expect(app.getByRole("heading", { name: /^(설정|Settings)$/ })).toBeFocused();
  // Inside Settings the notice has nothing to point to.
  await expect(app.getByText(firstRunTitle)).toBeHidden();
  await app.keyboard.press("Escape");
  await expect(app.getByText(firstRunTitle)).toBeVisible();
  expect((await readState(app))?.settings.firstRunNoticeDismissed ?? false).toBe(false);
});
test("Ctrl+, opens Settings, and Esc and Back return focus to the Settings button", async ({
  app,
}) => {
  await app.keyboard.press("Control+Comma");
  await expect(app.getByRole("heading", { name: /^(설정|Settings)$/ })).toBeFocused();
  await expect(settingsButton(app)).toHaveAttribute("aria-pressed", "true");
  await expectNoA11yViolations(app);
  await app.keyboard.press("Escape");
  await expect(settingsButton(app)).toBeFocused();
  await expect(app.getByRole("tablist")).toBeVisible();

  await settingsButton(app).click();
  await app.getByRole("button", { name: /돌아가기|Back/ }).click();
  await expect(settingsButton(app)).toBeFocused();
});

test.describe("keyboard order", () => {
  test.use({ localFiles: { state: savedState({}) } });

  test("follows the wireframe: game, Refresh, Settings, then the tabs", async ({ app }) => {
    await app.locator("body").click({ position: { x: 1, y: 1 } });
    const order: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      await app.keyboard.press("Tab");
      order.push(
        await app.evaluate(
          () =>
            document.activeElement?.getAttribute("role") ??
            document.activeElement?.textContent?.trim() ??
            null,
        ),
      );
    }
    expect(order[0]).toBe("combobox");
    expect(order[1]).toMatch(/새로 고침|Refresh/);
    expect(order[2]).toMatch(/^(설정|Settings)$/);
    expect(order[3]).toBe("tab");
  });
});

test.describe("damaged records", () => {
  const cached = JSON.stringify({ savedAt: NOW - 3_600_000, file: dataFile });
  test.use({
    localFiles: { state: "{damaged", "data-cache": cached },
    dataResponse: "offline",
  });

  test("runs read-only, never overwrites the file, and shows at most two banners", async ({
    app,
  }) => {
    await expect(app.getByText(/기록을 읽을 수 없습니다|Records can’t be read/)).toBeVisible();
    // Read-only, out of date, and first run all apply; only the first two show.
    await expect(
      app.getByText(/데이터가 오래됐을 수 있습니다|Data may be out of date/),
    ).toBeVisible();
    await expect(app.getByText(firstRunTitle)).toBeHidden();
    await app.getByRole("combobox").click();
    await app.getByRole("option").nth(1).click();
    await expect(app.locator("html")).toHaveAttribute("data-game", "hsr");
    const text = await app.evaluate(() =>
      (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
        "read_store",
        { file: "state" },
      ),
    );
    expect(text).toBe("{damaged");
    await expectNoA11yViolations(app);
  });
});
