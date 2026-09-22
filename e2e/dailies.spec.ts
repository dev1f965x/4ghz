import { expect, test } from "@playwright/test";
import { openApp, SEEN_TOUR, stored } from "./app";

test("finishing a game's chores marks today and starts a streak", async ({ page }) => {
  await openApp(page);
  await page.getByRole("tab", { name: "숙제" }).click();
  const genshin = page.getByRole("listitem").filter({ hasText: "원신" });

  await genshin.getByRole("checkbox", { name: "일일 의뢰" }).check();
  await genshin.getByRole("checkbox", { name: "레진 소모" }).check();

  await expect(genshin).toContainText("1일 연속");
  await expect(page.locator('.calendar__day[data-today="true"] .calendar__dot')).toHaveAttribute(
    "data-game",
    "genshin",
  );
  expect(await stored(page, "records.json", "dailies")).toMatchObject({
    done: { "2026-09-21": { genshin: ["commissions", "resin"] } },
  });
});

test("a game switched off can be switched back on from the filter", async ({ page }) => {
  await openApp(page, {
    "settings.json": { ...SEEN_TOUR["settings.json"], "game-filter": "zenless" },
    "records.json": { dailies: { games: ["genshin"], done: {} } },
  });
  await page.getByRole("tab", { name: "숙제" }).click();

  await expect(page.getByText("젠레스 존 제로는 챙길 게임에서 꺼져 있어요")).toBeVisible();
  await page.getByRole("button", { name: "켜기" }).click();

  await expect(page.getByRole("checkbox", { name: "배터리 소모" })).toBeVisible();
});

test("the dailies' game picker steps aside under a one-game filter, in the real browser", async ({
  page,
}) => {
  await openApp(page, {
    "settings.json": { ...SEEN_TOUR["settings.json"], "game-filter": "starrail" },
  });
  await page.getByRole("tab", { name: "숙제" }).click();

  await expect(page.getByRole("group", { name: "챙길 게임" })).toBeHidden();
  await expect(page.getByRole("button", { name: "새로고침" })).toBeVisible();
});
