import { expect, type Page, test } from "@playwright/test";
import { invoked, openApp, SEEN_TOUR, stored } from "./app";

const card = (page: Page, code: string) => page.getByRole("article").filter({ hasText: code });
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await page.getByRole("tab", { name: "리딤 코드" }).click();
});

test("an expired code is not listed", async ({ page }) => {
  await expect(card(page, "SAMPLE71LIVE")).toBeVisible();
  await expect(card(page, "SAMPLEEXPIRED")).toHaveCount(0);
});

test("copy puts the code on the clipboard and says so", async ({ page }) => {
  await card(page, "GENSHINGIFT").getByRole("button", { name: "복사" }).click();

  await expect(card(page, "GENSHINGIFT").getByRole("button", { name: "복사했어요" })).toBeVisible();
  expect(await clipboard(page)).toBe("GENSHINGIFT");
});

test("redeem copies the code, then opens only the game's official page", async ({ page }) => {
  await card(page, "STARRAILGIFT").getByRole("button", { name: "교환" }).click();

  await expect
    .poll(() => invoked(page, "plugin:opener|open_url"))
    .toEqual([
      expect.objectContaining({ url: "https://hsr.hoyoverse.com/gift?code=STARRAILGIFT" }),
    ]);
  expect(await clipboard(page)).toBe("STARRAILGIFT");
});

test("a used code stays under the pointer, then sinks the next time", async ({ page }) => {
  await expect(page.getByRole("article").first()).toContainText("GENSHINGIFT");
  await card(page, "GENSHINGIFT").getByRole("button", { name: "사용함" }).click();

  await expect(page.getByRole("article").first()).toContainText("GENSHINGIFT");
  await expect(card(page, "GENSHINGIFT").getByRole("button", { name: "사용함" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await stored(page, "records.json", "used-codes")).toEqual(["genshin:GENSHINGIFT"]);

  await page.getByRole("tab", { name: "일정" }).click();
  await page.getByRole("tab", { name: "리딤 코드" }).click();
  await expect(page.getByRole("article").last()).toContainText("GENSHINGIFT");
});

test("used marks from last time are there on launch", async ({ page }) => {
  await openApp(page, { ...SEEN_TOUR, "records.json": { "used-codes": ["zenless:ZENLESSGIFT"] } });
  await page.getByRole("tab", { name: "리딤 코드" }).click();

  await expect(page.getByRole("article").last()).toContainText("ZENLESSGIFT");
});
