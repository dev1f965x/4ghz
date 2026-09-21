import { expect, test } from "@playwright/test";
import { NOW, openApp, stored } from "./app";

test("each countdown ticks every second", async ({ page }) => {
  await openApp(page);
  await page.clock.pauseAt(new Date(NOW.getTime() + 10_000));
  const livestream = page.getByRole("article").filter({ hasText: "6.2 버전 특별 방송" });

  await expect(livestream).toContainText("22:59:50");
  await page.clock.runFor(1_000);
  await expect(livestream).toContainText("22:59:49");
});

test("refresh says it is working, then how long ago it fetched", async ({ page }) => {
  await openApp(page);

  await page.getByRole("button", { name: "새로고침" }).click();

  await expect(page.getByText("새로고침 중…")).toBeVisible();
  await expect(page.getByText("방금")).toBeVisible();
});

test("a first run walks through every step once", async ({ page }) => {
  await openApp(page, {});
  const dialog = page.getByRole("dialog");

  await expect(dialog).toContainText("1 / 4");
  for (let step = 0; step < 3; step++) await dialog.getByRole("button", { name: "다음" }).click();
  await dialog.getByRole("button", { name: "시작하기" }).click();

  await expect(dialog).toHaveCount(0);
  expect(await stored(page, "settings.json", "tour-seen")).toBe(true);
});
