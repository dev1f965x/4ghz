import type { Page } from "@playwright/test";
import { dataFile, expect, expectNoA11yViolations, NOW, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const stateWithTab = JSON.stringify({
  schemaVersion: 1,
  settings: { lastGame: "genshin", lastTab: "codes", firstRunNoticeDismissed: true },
});

const at = (ms: number) => new Date(ms).toISOString();
const empty = { schedule: [], codes: [], chores: [], periods: [] };
const withCodes = (codes: object[]) => ({
  ...(dataFile as object),
  games: { genshin: { ...empty, codes }, hsr: empty, zzz: empty },
});
const code = (name: string, addedAt: number, expires?: number) => ({
  code: name,
  rewards: { ko: "원석 60", en: "60 Primogems" },
  addedAt: at(addedAt),
  ...(expires === undefined ? {} : { expires: { kind: "instant", at: at(expires) } }),
});

const row = (app: Page, name: string) => app.getByRole("listitem").filter({ hasText: name });

test.describe("the Codes tab", () => {
  test.use({
    localFiles: { state: stateWithTab },
    dataResponse: {
      json: withCodes([
        code("OLDCODE", NOW - 86_400_000 * 3),
        code("SOONCODE", NOW - 86_400_000, NOW + 3 * 3_600_000),
        code("EXPIREDCODE", NOW - 3_600_000, NOW - 60_000),
        code("NEWCODE", NOW - 3_600_000),
      ]),
    },
  });

  test("lists active codes newest first and hides expired ones", async ({ app }) => {
    const codes = app.getByTestId("code");
    await expect(codes).toHaveText(["NEWCODE", "SOONCODE", "OLDCODE"]);
    await expect(row(app, "NEWCODE")).toContainText(/만료 시각 미정|Expiry unknown/);
    await expect(row(app, "SOONCODE")).toContainText(/3시간 0분 남음|3h 0m left/);
    await expect(row(app, "OLDCODE")).not.toContainText(/남음|left/);
  });

  test("copies a code, says so in place, and announces it", async ({ app }) => {
    await app.getByRole("button", { name: /“NEWCODE” 복사|Copy “NEWCODE”/ }).click();
    await expect(row(app, "NEWCODE").getByRole("button")).toHaveText(/복사됨|Copied/);
    await expect(app.getByRole("status").filter({ hasText: /NEWCODE/ })).toHaveText(
      /복사됨: “NEWCODE”\.|Copied “NEWCODE”\./,
    );
    expect(
      await app.evaluate(
        () => (window as unknown as { __E2E_CLIPBOARD__?: string }).__E2E_CLIPBOARD__,
      ),
    ).toBe("NEWCODE");
    await app.clock.runFor(2500);
    await expect(row(app, "NEWCODE").getByRole("button")).toHaveText(/^(복사|Copy)$/);
  });

  test("remembers redeemed codes", async ({ app }) => {
    await app.getByRole("checkbox", { name: /NEWCODE/ }).click();
    await expect(app.getByRole("checkbox", { name: /NEWCODE/ })).toBeChecked();
    await expect
      .poll(async () => {
        const text = await app.evaluate(() =>
          (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
            "read_store",
            { file: "state" },
          ),
        );
        return (JSON.parse(text as string) as { redeemedCodes: { genshin: string[] } })
          .redeemedCodes.genshin;
      })
      .toEqual(["NEWCODE"]);
  });

  test("opens the game's redemption page", async ({ app }, testInfo) => {
    await app.getByRole("button", { name: /교환 페이지 열기|Open redemption page/ }).click();
    const language = testInfo.project.name.startsWith("ko") ? "ko" : "en";
    await expect
      .poll(() =>
        app.evaluate(() => (window as unknown as { __E2E_OPENED__?: string[] }).__E2E_OPENED__),
      )
      .toEqual([`https://genshin.hoyoverse.com/${language}/gift`]);
  });

  for (const size of [
    { width: 720, height: 560 },
    { width: 1120, height: 760 },
  ]) {
    test(`passes axe checks at ${size.width} x ${size.height}`, async ({ app }) => {
      await app.setViewportSize(size);
      await expect(row(app, "NEWCODE")).toBeVisible();
      await expectNoA11yViolations(app);
    });
  }
});

test.describe("with a code redeemed earlier", () => {
  test.use({
    localFiles: {
      state: JSON.stringify({
        ...JSON.parse(stateWithTab),
        redeemedCodes: { genshin: ["MIXEDCASE"], hsr: [], zzz: [] },
      }),
    },
    dataResponse: {
      json: withCodes([
        // The data now spells the code differently; the mark still applies.
        code("MixedCase", NOW - 3_600_000),
        // Just under a day left: no countdown, since it rounds up to a full day.
        code("ALMOSTADAY", NOW - 7_200_000, NOW + 86_400_000 - 30_000),
      ]),
    },
  });

  test("restores the mark, dims the row, and stays accessible", async ({ app }) => {
    await expect(app.getByRole("checkbox", { name: /MixedCase/ })).toBeChecked();
    await expect(row(app, "ALMOSTADAY")).not.toContainText(/남음|left/);
    await expectNoA11yViolations(app);
  });
});

test.describe("with no active codes", () => {
  test.use({
    localFiles: { state: stateWithTab },
    dataResponse: { json: withCodes([code("EXPIREDCODE", NOW - 3_600_000, NOW - 60_000)]) },
  });

  test("says there are none", async ({ app }) => {
    await expect(app.getByText(/사용 가능한 코드가 없습니다|No active codes/)).toBeVisible();
    await expectNoA11yViolations(app);
  });
});
