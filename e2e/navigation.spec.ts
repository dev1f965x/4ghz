import { expect, test } from "@playwright/test";
import { openApp } from "./app";

test("tabs are visited like pages, and back and forward walk them", async ({ page }) => {
  await openApp(page);
  const tab = (name: string) => page.getByRole("tab", { name });
  const back = page.getByRole("button", { name: "뒤로" });
  const forward = page.getByRole("button", { name: "앞으로" });
  await expect(tab("일정")).toHaveAttribute("aria-selected", "true");
  await expect(back).toBeDisabled();

  await tab("리딤 코드").click();
  await tab("숙제").click();
  await back.click();
  await expect(tab("리딤 코드")).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Alt+ArrowLeft");
  await expect(tab("일정")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Alt+ArrowRight");
  await expect(tab("리딤 코드")).toHaveAttribute("aria-selected", "true");

  await tab("일정").click();
  await expect(forward).toBeDisabled();
});

test("arrow keys move along the tabs when one has focus", async ({ page }) => {
  await openApp(page);

  await page.getByRole("tab", { name: "일정" }).focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByRole("tab", { name: "리딤 코드" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-codes");
});
