import { expect, expectNoA11yViolations, test } from "./fixtures";

const sizes = [
  { name: "minimum", width: 720, height: 560 },
  { name: "default", width: 1120, height: 760 },
];

test("shows the tabs in the Windows display language", async ({ app }, testInfo) => {
  const korean = testInfo.project.name.startsWith("ko");
  await expect(app.locator("html")).toHaveAttribute("lang", korean ? "ko" : "en");
  for (const tab of korean ? ["일정", "코드", "캘린더"] : ["Schedule", "Codes", "Calendar"]) {
    await expect(app.getByRole("tab", { name: tab })).toBeVisible();
  }
});

test("switches the accent with the selected game", async ({ app }) => {
  await expect(app.locator("html")).toHaveAttribute("data-game", "genshin");
  await app.getByRole("combobox").click();
  await app.getByRole("option").nth(1).click();
  await expect(app.locator("html")).toHaveAttribute("data-game", "hsr");
});

test("passes axe checks", async ({ app }) => {
  await expectNoA11yViolations(app);
  await app.getByRole("combobox").click();
  await expect(app.getByRole("listbox")).toBeVisible();
  await expectNoA11yViolations(app);
});

for (const size of sizes) {
  test(`screenshot at the ${size.name} window size`, async ({ app }, testInfo) => {
    await app.setViewportSize({ width: size.width, height: size.height });
    await app.evaluate(() => document.fonts.ready);
    await testInfo.attach(`${testInfo.project.name}-${size.name}.png`, {
      body: await app.screenshot(),
      contentType: "image/png",
    });
  });
}
