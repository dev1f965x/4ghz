import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "./fixtures";

type Internals = { invoke: (cmd: string, args: object) => Promise<unknown> };

const state = (extra: object = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    settings: { lastGame: "genshin", lastTab: "schedule", firstRunNoticeDismissed: true, ...extra },
  });
const opened = (app: Page) =>
  app.evaluate(() => (window as unknown as { __E2E_OPENED__?: string[] }).__E2E_OPENED__);
const updateNotice = (app: Page) =>
  app.getByText(/새 버전이 나왔습니다|A new version is available/);

test.describe("with a newer release", () => {
  test.use({ localFiles: { state: state() }, latestRelease: { tag_name: "v0.2.0" } });

  test("shows a notice that opens the release and stays dismissed", async ({ app }) => {
    await expect(updateNotice(app)).toBeVisible();
    await expect(app.getByText(/4ghz 0\.2\.0/)).toBeVisible();
    await app.getByRole("button", { name: /릴리스 열기|Open release/ }).click();
    await expect
      .poll(() => opened(app))
      .toEqual(["https://github.com/dev1f965x/4ghz/releases/tag/v0.2.0"]);
    await expectNoA11yViolations(app);
    await app
      .getByRole("button", { name: /새 버전 알림 닫기|Dismiss the new version notice/ })
      .click();
    await expect(updateNotice(app)).toHaveCount(0);
    await expect
      .poll(async () => {
        const text = await app.evaluate(() =>
          (window as unknown as { __TAURI_INTERNALS__: Internals }).__TAURI_INTERNALS__.invoke(
            "read_store",
            { file: "state" },
          ),
        );
        return (JSON.parse(text as string) as { settings: { dismissedUpdateVersion?: string } })
          .settings.dismissedUpdateVersion;
      })
      .toBe("0.2.0");
  });
});

test.describe("with that release dismissed earlier", () => {
  test.use({
    localFiles: { state: state({ dismissedUpdateVersion: "0.2.0" }) },
    latestRelease: { tag_name: "v0.2.0" },
  });

  test("shows nothing until a later version", async ({ app }) => {
    await expect(app.getByRole("tab", { name: /^(일정|Schedule)$/ })).toBeVisible();
    await expect(updateNotice(app)).toHaveCount(0);
  });
});

test.describe("before any release", () => {
  test.use({ localFiles: { state: state() }, latestRelease: "none" });

  test("shows nothing when the check fails", async ({ app }) => {
    await expect(app.getByRole("tab", { name: /^(일정|Schedule)$/ })).toBeVisible();
    await expect(updateNotice(app)).toHaveCount(0);
  });
});

test.describe("About", () => {
  test.use({ localFiles: { state: state() } });

  test("shows the version, notices, licenses, and feedback link", async ({ app }) => {
    // The notices file is generated at app build time; the browser build gets a sample.
    await app.route("**/third-party-notices.txt", (route) =>
      route.fulfill({ contentType: "text/plain", body: "sample-package 1.0.0\nMIT License" }),
    );
    await app.getByRole("button", { name: /^(설정|Settings)$/ }).click();
    await app.getByRole("tab", { name: /^(정보|About)$/ }).click();
    await expect(app.getByRole("heading", { name: "4ghz 0.1.0" })).toBeVisible();
    await expect(app.getByText(/비공식 앱|unofficial app/)).toBeVisible();
    await expect(
      app.getByText(/각 권리자의 상표|trademarks of their respective owners/),
    ).toBeVisible();
    await expect(
      app.getByText(/개인정보를 모으지 않습니다|collects no personal data/),
    ).toBeVisible();
    await expectNoA11yViolations(app);

    await app.getByRole("button", { name: /MIT 라이선스|MIT License/ }).click();
    const dialog = app.getByRole("dialog");
    await expect(dialog).toContainText("Copyright (c) 2026");
    await expectNoA11yViolations(app);
    await app.keyboard.press("Escape");
    await expect(app.getByRole("button", { name: /MIT 라이선스|MIT License/ })).toBeFocused();

    await app.getByRole("button", { name: /서드파티 고지|Third-party notices/ }).click();
    await expect(dialog).toContainText("sample-package 1.0.0");
    await dialog.getByRole("button", { name: /^(닫기|Close)$/ }).click();

    await app.getByRole("button", { name: /의견 보내기|Send feedback/ }).click();
    await expect.poll(() => opened(app)).toEqual(["https://github.com/dev1f965x/4ghz/issues"]);
  });
});
