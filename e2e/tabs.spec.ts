import { expect, test } from "@playwright/test";
import { openApp } from "./app";

test("the window opens on the schedule, and a click opens another tab", async ({ page }) => {
  await openApp(page);
  const tab = (name: string) => page.getByRole("tab", { name });
  await expect(tab("일정")).toHaveAttribute("aria-selected", "true");

  await tab("숙제").click();

  await expect(tab("숙제")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-dailies");
});

test("arrow keys move along the tabs when one has focus", async ({ page }) => {
  await openApp(page);

  await page.getByRole("tab", { name: "일정" }).focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByRole("tab", { name: "리딤 코드" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-codes");
});
