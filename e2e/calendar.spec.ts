import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, NOW, test } from "./fixtures";

const KST_0500 = (day: string) => Date.parse(`${day}T05:00:00+09:00`);
const record = (result: "done" | "not-done") => ({ result, fixedAt: NOW - 60_000 });
// Chores seen before tracking began count at once; ids missing here count from the next day.
const history = (days: Record<string, ReturnType<typeof record>>) => ({
  initialized: true,
  firstSeen: { commissions: 0, resin: 0 },
  countFrom: KST_0500("2026-09-01"),
  lastFixedLabel: "2026-10-05",
  lastAdvancedAt: NOW - 60_000,
  days,
  dailyChecks: {},
  cycleChecks: {},
  cycleEndedAt: {},
});
const withHistory = JSON.stringify({
  schemaVersion: 1,
  settings: { lastGame: "genshin", lastTab: "calendar", firstRunNoticeDismissed: true },
  chores: {
    genshin: history({ "2026-10-05": record("done"), "2026-09-20": record("not-done") }),
    hsr: history({ "2026-10-05": record("done") }),
    zzz: history({}),
  },
});

const grid = (app: Page) => app.getByRole("grid");
const cell = (app: Page, name: RegExp) => grid(app).getByRole("gridcell", { name });

test.describe("the month calendar", () => {
  test.use({ localFiles: { state: withHistory } });

  test("shows the month with today, results, and the highlight", async ({ app }) => {
    await expect(app.getByRole("heading", { name: /2026년 10월|October 2026/ })).toBeVisible();
    const today = cell(app, /^(10월 6일 화요일|Tuesday, October 6), (오늘|today)/);
    await expect(today).toHaveAttribute("aria-current", "date");
    await expect(today).toHaveAttribute("tabindex", "0");
    await expect(cell(app, /^(10월 5일 월요일|Monday, October 5):/)).toHaveAccessibleName(
      /원신 완료, 붕괴: 스타레일 완료, 젠레스 존 제로 기록 없음, 하는 게임 모두 완료|Genshin Impact done, Honkai: Star Rail done, Zenless Zone Zero no record, all played games done/,
    );
    await expect(
      cell(app, /^(10월 7일 수요일|Wednesday, October 7), (다가올 날|upcoming)$/),
    ).toBeVisible();
  });

  test("checking every daily chore marks today", async ({ app }) => {
    for (const name of [/일일 의뢰|Daily commissions/, /퓨어 레진|Original Resin/]) {
      await app.getByRole("checkbox", { name }).click();
    }
    await expect(cell(app, /^(10월 6일 화요일|Tuesday, October 6)/)).toHaveAccessibleName(
      /원신 완료|Genshin Impact done/,
    );
  });

  test("moves by keyboard and by month", async ({ app }) => {
    const today = cell(app, /^(10월 6일 화요일|Tuesday, October 6)/);
    await today.focus();
    await app.keyboard.press("ArrowRight");
    await expect(cell(app, /^(10월 7일 수요일|Wednesday, October 7)/)).toBeFocused();
    await app.keyboard.press("ArrowUp");
    await expect(cell(app, /^(9월 30일 수요일|Wednesday, September 30)/)).toBeFocused();
    await expect(app.getByRole("heading", { name: /2026년 9월|September 2026/ })).toBeVisible();
    await expect(cell(app, /^(9월 20일 일요일|Sunday, September 20):/)).toHaveAccessibleName(
      /원신 미완료|Genshin Impact not done/,
    );
    // Earlier months are open whether or not they have records.
    await app.keyboard.press("PageUp");
    await expect(app.getByRole("heading", { name: /2026년 8월|August 2026/ })).toBeVisible();

    const previous = app.getByRole("button", { name: /이전 달|Previous month/ });
    const next = app.getByRole("button", { name: /다음 달|Next month/ });
    await next.click();
    await expect(app.getByRole("heading", { name: /2026년 9월|September 2026/ })).toBeVisible();
    await expect(
      app.getByRole("status").filter({ hasText: /2026년 9월|September 2026/ }),
    ).toBeAttached();
    await expect(next).toBeFocused();
    await next.click();
    await next.click();
    // Later months show the days to come.
    await expect(app.getByRole("heading", { name: /2026년 11월|November 2026/ })).toBeVisible();
    await previous.click();
    await expect(previous).toBeFocused();
    await expect(app.getByRole("heading", { name: /2026년 10월|October 2026/ })).toBeVisible();
    await app.getByRole("button", { name: /^(오늘|Today)$/ }).click();
    await expect(today).toHaveAttribute("tabindex", "0");
    await expect(app.getByRole("button", { name: /^(오늘|Today)$/ })).toBeFocused();
  });

  test("moves to the week's ends and stops a year ahead", async ({ app }) => {
    await cell(app, /^(10월 6일 화요일|Tuesday, October 6)/).focus();
    await app.keyboard.press("Home");
    await expect(cell(app, /^(10월 5일 월요일|Monday, October 5)/)).toBeFocused();
    await app.keyboard.press("End");
    await expect(cell(app, /^(10월 11일 일요일|Sunday, October 11)/)).toBeFocused();
    const next = app.getByRole("button", { name: /다음 달|Next month/ });
    for (let i = 0; i < 12; i++) await next.click();
    await expect(app.getByRole("heading", { name: /2027년 10월|October 2027/ })).toBeVisible();
    // The button turns inactive at the last month but keeps focus; Enter does nothing.
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(next).toBeFocused();
    await app.keyboard.press("Enter");
    await expect(app.getByRole("heading", { name: /2027년 10월|October 2027/ })).toBeVisible();
  });

  test("a click on a day of the next month opens that month", async ({ app }) => {
    await cell(app, /^(11월 1일 일요일|Sunday, November 1)/).click();
    await expect(app.getByRole("heading", { name: /2026년 11월|November 2026/ })).toBeVisible();
    const first = cell(app, /^(11월 1일 일요일|Sunday, November 1),/);
    await expect(first).toHaveAttribute("tabindex", "0");
    await expect(first).toBeFocused();
  });

  test("puts the grid below the checklist at 720 x 560", async ({ app }) => {
    await app.setViewportSize({ width: 720, height: 560 });
    const checklist = await app.getByRole("region", { name: /^(일간|Daily)$/ }).boundingBox();
    const month = await grid(app).boundingBox();
    expect(checklist && month && month.y > checklist.y + checklist.height).toBe(true);
  });

  for (const size of [
    { width: 720, height: 560 },
    { width: 1120, height: 760 },
  ]) {
    test(`passes axe checks at ${size.width} x ${size.height}`, async ({ app }) => {
      await app.setViewportSize(size);
      await expect(grid(app)).toBeVisible();
      await expectNoA11yViolations(app);
    });
  }
});

test.describe("without a data file", () => {
  test.use({ localFiles: { state: withHistory }, dataResponse: "offline" });

  test("still shows the grid with stored days", async ({ app }) => {
    await expect(
      app.getByText(/데이터를 불러오지 못했습니다|Data couldn’t be loaded/),
    ).toBeVisible();
    await expect(cell(app, /^(10월 5일 월요일|Monday, October 5):/)).toHaveAccessibleName(
      /하는 게임 모두 완료|all played games done/,
    );
  });
});

test.describe("with a game turned off that has older records", () => {
  test.use({
    localFiles: {
      state: JSON.stringify({
        schemaVersion: 1,
        settings: {
          lastGame: "genshin",
          lastTab: "calendar",
          firstRunNoticeDismissed: true,
          games: {
            genshin: { plays: true, region: "asia" },
            hsr: { plays: false, region: "asia" },
            zzz: { plays: true, region: "asia" },
          },
          choreOverrides: { genshin: {}, hsr: {}, zzz: {} },
        },
        chores: {
          genshin: {
            ...history({}),
            countFrom: KST_0500("2026-10-01"),
            lastFixedLabel: "2026-10-05",
          },
          hsr: history({ "2026-09-20": record("done") }),
          zzz: { ...history({}), countFrom: KST_0500("2026-10-01"), lastFixedLabel: "2026-10-05" },
        },
      }),
    },
  });

  test("reads the marks that still show before tracking began", async ({ app }) => {
    await app.getByRole("button", { name: /이전 달|Previous month/ }).click();
    await expect(cell(app, /^(9월 20일 일요일|Sunday, September 20)/)).toHaveAccessibleName(
      /^(9월 20일 일요일: 붕괴: 스타레일 완료, 하는 게임 모두 완료|Sunday, September 20: Honkai: Star Rail done, all played games done)$/,
    );
    // The legend keeps the game while its marks show, though it is turned off.
    await expect(
      app.getByRole("listitem").filter({ hasText: /^(붕괴: 스타레일|Honkai: Star Rail)$/ }),
    ).toBeVisible();
  });
});
