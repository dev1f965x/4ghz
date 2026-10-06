import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

/** The data file served in place of GitHub Pages. */
const dataFile = readFileSync(new URL("./fixtures/data.json", import.meta.url), "utf8");

type Options = {
  /** Contents of the app's local files before the page loads; none means a first run. */
  localFiles: Partial<Record<"state" | "data-cache", string>>;
};

export const test = base.extend<Options & { app: Page }>({
  localFiles: [{}, { option: true }],
  app: async ({ page, localFiles }, use) => {
    await page.addInitScript((files) => {
      // Read by src/e2e-mocks.ts when the app starts.
      (window as unknown as { __E2E_FILES__: typeof files }).__E2E_FILES__ = files;
    }, localFiles);
    // Only the dev server and the data file are reachable; any other request fails the test.
    const unexpected: string[] = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "localhost") return route.continue();
      if (url.href.startsWith("https://dev1f965x.github.io/4ghz/data/")) {
        return route.fulfill({ contentType: "application/json", body: dataFile });
      }
      unexpected.push(url.href);
      return route.abort();
    });
    await page.goto("/");
    // The app sets data-game once it has rendered, after the IPC mocks are installed.
    await page.locator("html[data-game]").waitFor({ state: "attached" });
    await use(page);
    expect(unexpected, "unexpected network requests").toEqual([]);
  },
});

/** WCAG 2.2 AA checks with axe-core. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

export { expect };
