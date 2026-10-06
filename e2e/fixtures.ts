import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

/** The data file served in place of GitHub Pages. */
export const dataFile: unknown = JSON.parse(
  readFileSync(new URL("./fixtures/data.json", import.meta.url), "utf8"),
);

/** What GitHub Pages answers: a data file (any JSON), or no connection. */
type DataResponse = { json: unknown } | "offline";

type Options = {
  /** Contents of the app's local files before the page loads; none means a first run. */
  localFiles: Partial<Record<"state" | "data-cache", string>>;
  /** The first answer for the data file; tests change later answers with `network.serve`. */
  dataResponse: DataResponse;
};

type Fixtures = {
  app: Page;
  /** Changes what the data file request answers from now on. */
  network: { serve: (response: DataResponse) => void; current: () => DataResponse };
};

export const test = base.extend<Options & Fixtures>({
  localFiles: [{}, { option: true }],
  dataResponse: [{ json: dataFile }, { option: true }],
  network: async ({ dataResponse }, use) => {
    let current = dataResponse;
    await use({
      serve: (response) => {
        current = response;
      },
      current: () => current,
    });
  },
  app: async ({ page, localFiles, network }, use) => {
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
        const response = network.current();
        if (response === "offline") return route.abort("internetdisconnected");
        return route.fulfill({ json: response.json });
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
