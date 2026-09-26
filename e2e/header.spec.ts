import { expect, test } from "@playwright/test";
import { NOW, openApp, SEEN_TOUR, stored } from "./app";

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

test("a waiting release is offered in the title bar, leaving the content where it was", async ({
  page,
}) => {
  await openApp(page);
  const heading = page.getByRole("heading", { name: "진행 중인 일정" });
  const before = await heading.boundingBox();

  await openApp(page, SEEN_TOUR, "?update=1.3.0");
  const install = page.getByRole("banner").getByRole("button", { name: "업데이트" });
  await expect(install).toHaveAttribute("title", "1.3.0 사용 가능");
  expect(await heading.boundingBox()).toEqual(before);

  await install.click();
  await expect(page.getByRole("button", { name: "내려받는 중 40%" })).toBeDisabled();
});
