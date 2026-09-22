import { expect, test } from "@playwright/test";
import { openApp, SEEN_TOUR, stored } from "./app";

test("one game narrows every tab and dresses the window in its colour", async ({ page }) => {
  await openApp(page);

  await page.getByRole("button", { name: "게임: 전체" }).click();
  await page.getByRole("option", { name: "젠레스 존 제로" }).click();

  await expect(page.locator(".app")).toHaveAttribute("data-game", "zenless");
  await expect(page.getByRole("heading", { name: "공허 수사 이벤트" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "6.2 버전 특별 방송" })).toHaveCount(0);

  await page.getByRole("tab", { name: "리딤 코드" }).click();
  await expect(page.getByRole("article").getByRole("heading")).toHaveText(["ZENLESSGIFT"]);

  expect(await stored(page, "settings.json", "game-filter")).toBe("zenless");
});

test("the game picked last time is picked again", async ({ page }) => {
  await openApp(page, {
    "settings.json": { ...SEEN_TOUR["settings.json"], "game-filter": "starrail" },
  });

  await expect(page.getByRole("button", { name: "게임: 붕괴: 스타레일" })).toBeVisible();
  await expect(page.locator(".app")).toHaveAttribute("data-game", "starrail");
});

test("the menu works from the keyboard and closes on Escape", async ({ page }) => {
  await openApp(page);
  const trigger = page.getByRole("button", { name: "게임: 전체" });

  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
