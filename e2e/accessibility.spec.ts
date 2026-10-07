// Pre-acceptance accessibility checks on every screen: Windows contrast themes through
// forced colors, and the largest Windows text size. Screenshots are attached to the report for
// review; Narrator is checked by hand during acceptance testing.
import type { Page, TestInfo } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "./fixtures";

const state = JSON.stringify({
  schemaVersion: 1,
  settings: { lastGame: "genshin", lastTab: "schedule", firstRunNoticeDismissed: false },
});

type Screen = { name: string; open: (app: Page) => Promise<void> };

const tab = (name: RegExp) => async (app: Page) => {
  await app.getByRole("tab", { name }).click();
};
const settingsSection = (name: RegExp) => async (app: Page) => {
  await app.getByRole("button", { name: /^(설정|Settings)$/ }).click();
  await app.getByRole("tab", { name }).click();
};

const screens: Screen[] = [
  { name: "schedule", open: tab(/^(일정|Schedule)$/) },
  { name: "codes", open: tab(/^(코드|Codes)$/) },
  { name: "calendar", open: tab(/^(캘린더|Calendar)$/) },
  { name: "settings-game", open: settingsSection(/원신|Genshin Impact/) },
  { name: "settings-language", open: settingsSection(/^(언어|Language)$/) },
  { name: "settings-data", open: settingsSection(/^(데이터|Data)$/) },
  { name: "settings-about", open: settingsSection(/^(정보|About)$/) },
];

async function attach(app: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await app.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test.describe("in a Windows contrast theme", () => {
  test.use({ localFiles: { state }, forcedColors: "active" });

  for (const screen of screens) {
    test(`${screen.name} passes axe checks`, async ({ app }, testInfo) => {
      await app.setViewportSize({ width: 720, height: 560 });
      await screen.open(app);
      await expectNoA11yViolations(app);
      await attach(app, testInfo, `forced-colors-${screen.name}`);
    });
  }
});

test.describe("at 225% text size", () => {
  test.use({ localFiles: { state } });

  for (const screen of screens) {
    test(`${screen.name} fits the minimum window without sideways scrolling`, async ({
      app,
    }, testInfo) => {
      await app.setViewportSize({ width: 720, height: 560 });
      // WebView2 applies the Windows text size to the root font size, and the layout uses rem,
      // so this matches the setting.
      await app.addStyleTag({ content: "html { font-size: 225%; }" });
      await screen.open(app);
      // The page and the content area below the title bar, which scrolls on its own.
      const overflow = await app.evaluate(() =>
        Math.max(
          ...[document.documentElement, document.querySelector("[data-scroll-root]")].map((e) =>
            e ? e.scrollWidth - e.clientWidth : 0,
          ),
        ),
      );
      expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
      await attach(app, testInfo, `text-225-${screen.name}`);
    });
  }
});
