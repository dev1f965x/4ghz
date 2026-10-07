import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, NOW, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const KST_0500 = (day: string) => Date.parse(`${day}T05:00:00+09:00`);
const settings = { lastGame: "genshin", lastTab: "calendar", firstRunNoticeDismissed: true };
const onCalendar = JSON.stringify({ schemaVersion: 1, settings });
// Tracked since September, with Oct 5 already recorded.
const history = {
  initialized: true,
  firstSeen: { commissions: 0, resin: 0 },
  countFrom: KST_0500("2026-09-01"),
  lastFixedLabel: "2026-10-05",
  lastAdvancedAt: NOW - 60_000,
  days: { "2026-10-05": { result: "done", fixedAt: NOW - 60_000 } },
  dailyChecks: {},
  cycleChecks: {},
  cycleEndedAt: {},
};
const withHistory = JSON.stringify({
  schemaVersion: 1,
  settings,
  chores: { genshin: history, hsr: history, zzz: history },
});

const settingsButton = (app: Page) => app.getByRole("button", { name: /^(설정|Settings)$/ });
const back = (app: Page) => app.getByRole("button", { name: /돌아가기|Back/ });
const section = (app: Page, name: RegExp) => app.getByRole("tab", { name });

async function savedSettings(app: Page) {
  const text = await app.evaluate(() =>
    (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
      "read_store",
      { file: "state" },
    ),
  );
  return (JSON.parse(text as string) as { settings: Record<string, unknown> }).settings;
}

async function chooseServer(app: Page, name: RegExp) {
  await app.getByRole("combobox", { name: /^(서버|Server)$/ }).click();
  await app.getByRole("option", { name }).click();
}

test.describe("Settings for a game", () => {
  test.use({ localFiles: { state: onCalendar } });

  test("opens on the selected game and turns chores off", async ({ app }) => {
    await settingsButton(app).click();
    await expect(section(app, /원신|Genshin Impact/)).toHaveAttribute("aria-selected", "true");
    const resin = app.getByRole("switch", { name: /퓨어 레진 소모|Spend Original Resin/ });
    await expect(resin).toBeChecked();
    await resin.click();
    await expect(resin).not.toBeChecked();
    // Off by default in the data file, and the user can turn it on.
    await app.getByRole("switch", { name: /속세의 주전자|Serenitea Pot/ }).click();
    await expect
      .poll(async () => (await savedSettings(app)).choreOverrides)
      .toEqual({
        genshin: { resin: false, teapot: true },
        hsr: {},
        zzz: {},
      });
    await back(app).click();
    await expect(settingsButton(app)).toBeFocused();
    const daily = app.getByRole("region", { name: /^(일간|Daily)$/ });
    await expect(daily.getByRole("checkbox")).toHaveCount(2);
    await expect(daily).toContainText(/주전자|Serenitea/);
    await expect(daily).not.toContainText(/레진|Resin/);
  });

  test("a game turned off has no checklist but keeps its schedule", async ({ app }) => {
    await settingsButton(app).click();
    const playing = app.getByRole("switch", { name: /^(플레이 중|Playing)$/ });
    await expect(playing).toHaveAccessibleDescription(
      /일정과 코드는 계속|Schedules and codes stay/,
    );
    await playing.click();
    await app.keyboard.press("Escape");
    await expect(
      app.getByText(/기록하지 않는 게임입니다|Genshin Impact isn’t tracked/),
    ).toBeVisible();
    await app.getByRole("tab", { name: /^(일정|Schedule)$/ }).click();
    await expect(app.getByRole("heading", { name: /진행 중|Ongoing/ })).toBeVisible();
  });

  test("changing the server on a first day applies at once", async ({ app }) => {
    await settingsButton(app).click();
    await chooseServer(app, /^(미국|America)$/);
    const dialog = app.getByRole("alertdialog");
    await expect(dialog).toContainText(
      /일간 숙제를 지금부터 미국 서버 기준으로 기록합니다|Daily chores are recorded on America server time from now on/,
    );
    await expectNoA11yViolations(app);
    await dialog.getByRole("button", { name: /서버 바꾸기|Change server/ }).click();
    await expect(app.getByRole("combobox", { name: /^(서버|Server)$/ })).toHaveText(/미국|America/);
    await back(app).click();
    // America resets at 18:00 Korea time.
    await expect(app.getByRole("region", { name: /^(일간|Daily)$/ })).toContainText(
      /오늘 18:00 초기화|10월 6일 18:00 초기화|Resets Oct 6, 18:00/,
    );
  });

  test("can be cancelled", async ({ app }) => {
    await settingsButton(app).click();
    await chooseServer(app, /^(유럽|Europe)$/);
    await app.getByRole("button", { name: /^(취소|Cancel)$/ }).click();
    await expect(app.getByRole("combobox", { name: /^(서버|Server)$/ })).toHaveText(/아시아|Asia/);
    const { games } = (await savedSettings(app)) as { games: { genshin: { region: string } } };
    expect(games.genshin.region).toBe("asia");
  });

  for (const size of [
    { width: 720, height: 560 },
    { width: 1120, height: 760 },
  ]) {
    test(`passes axe checks at ${size.width} x ${size.height}`, async ({ app }) => {
      await app.setViewportSize(size);
      await settingsButton(app).click();
      await expect(app.getByRole("switch").first()).toBeVisible();
      await expectNoA11yViolations(app);
      await section(app, /^(데이터|Data)$/).click();
      await expect(app.getByText(/%LOCALAPPDATA%/)).toBeVisible();
      await expectNoA11yViolations(app);
    });
  }
});

test.describe("changing the server with history", () => {
  test.use({ localFiles: { state: withHistory } });

  test("names when recording resumes when today has no checks", async ({ app }) => {
    await settingsButton(app).click();
    await chooseServer(app, /^(미국|America)$/);
    await expect(app.getByRole("alertdialog")).toContainText(
      /10월 6일은 체크한 숙제가 없어 기록하지 않습니다\. 일간 숙제는 10월 6일 18:00부터|Oct 6 has no checks, so it isn’t recorded\. Daily chores are recorded again on America server time from Oct 6, 18:00/,
    );
  });

  test("keeps today's checks and resumes the next America day", async ({ app }) => {
    await app.getByRole("checkbox", { name: /일일 의뢰|Daily commissions/ }).click();
    await settingsButton(app).click();
    await chooseServer(app, /^(미국|America)$/);
    await expect(app.getByRole("alertdialog")).toContainText(
      /10월 6일 기록은 지금까지 체크한 대로 확정됩니다\. 일간 숙제는 10월 7일 18:00부터|The record for Oct 6 is kept as checked so far\. Daily chores are recorded again on America server time from Oct 7, 18:00/,
    );
    await app.getByRole("button", { name: /서버 바꾸기|Change server/ }).click();
    await back(app).click();
    await expect(app.getByRole("region", { name: /^(일간|Daily)$/ })).toContainText(
      /일간 숙제는 10월 7일 18:00부터 다시 기록합니다|Daily chores are recorded again from Oct 7, 18:00/,
    );
  });
});

test.describe("language", () => {
  test.use({ localFiles: { state: onCalendar } });

  test("switches at once and is remembered", async ({ app }) => {
    await settingsButton(app).click();
    await section(app, /^(언어|Language)$/).click();
    await expect(app.getByRole("radio", { name: /Windows/ })).toBeChecked();
    await app.getByRole("radio", { name: "English" }).click();
    await expect(app.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(app.locator("html")).toHaveAttribute("lang", "en");
    await app.getByRole("radio", { name: "한국어" }).click();
    await expect(app.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
    await expect.poll(async () => (await savedSettings(app)).locale).toBe("ko");
    // Back to the Windows setting: nothing is stored, so the next start follows Windows again.
    await app.getByRole("radio", { name: /Windows/ }).click();
    await expect.poll(async () => "locale" in (await savedSettings(app))).toBe(false);
  });
});

test.describe("data", () => {
  test.use({ localFiles: { state: onCalendar } });

  test("shows where records are and opens the folder", async ({ app }) => {
    await settingsButton(app).click();
    await section(app, /^(데이터|Data)$/).click();
    await expect(app.getByText("%LOCALAPPDATA%\\io.github.dev1f965x.4ghz")).toBeVisible();
    await expect(app.getByText(/앱 데이터 삭제|delete app data/)).toBeVisible();
    await app.getByRole("button", { name: /데이터 폴더 열기|Open data folder/ }).click();
    await expect
      .poll(() =>
        app.evaluate(
          () => (window as unknown as { __E2E_FOLDER_OPENED__?: number }).__E2E_FOLDER_OPENED__,
        ),
      )
      .toBe(1);
  });
});

test.describe("with unreadable records", () => {
  test.use({ localFiles: { state: "{ not json" } });

  test("the banner opens the data folder", async ({ app }) => {
    await app.getByRole("button", { name: /데이터 폴더 열기|Open data folder/ }).click();
    await expect
      .poll(() =>
        app.evaluate(
          () => (window as unknown as { __E2E_FOLDER_OPENED__?: number }).__E2E_FOLDER_OPENED__,
        ),
      )
      .toBe(1);
  });
});
