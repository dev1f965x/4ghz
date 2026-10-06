import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

/** The data file served in place of GitHub Pages. */
export const dataFile: unknown = JSON.parse(
  readFileSync(new URL("./fixtures/data.json", import.meta.url), "utf8"),
);

/**
 * The time the app sees in every test: Tuesday 2026-10-06 10:42 in Korea, the wireframes'
 * reference moment, so schedules and countdowns from the data fixture are deterministic.
 */
export const NOW = Date.parse("2026-10-06T01:42:00Z");

/** What GitHub Pages answers: a data file (any JSON), or no connection. */
type DataResponse = { json: unknown } | "offline";

type Options = {
  /** Contents of the app's local files before the page loads; none means a first run. */
  localFiles: Partial<Record<"state" | "data-cache", string>>;
  /** The first answer for the data file; tests change later answers with `network.serve`. */
  dataResponse: DataResponse;
  /**
   * What the GitHub API answers for the latest release: "none" is a 404, as before any release,
   * and "error" a 500.
   */
  latestRelease: { tag_name: string } | "none" | "error";
};

type Fixtures = {
  app: Page;
  /** Changes what the data file request answers from now on. */
  network: { serve: (response: DataResponse) => void; current: () => DataResponse };
};

export const test = base.extend<Options & Fixtures>({
  localFiles: [{}, { option: true }],
  dataResponse: [{ json: dataFile }, { option: true }],
  // The app's own version, so no update notice shows unless a test asks for one.
  latestRelease: [{ tag_name: "v0.1.0" }, { option: true }],
  network: async ({ dataResponse }, use) => {
    let current = dataResponse;
    await use({
      serve: (response) => {
        current = response;
      },
      current: () => current,
    });
  },
  app: async ({ page, localFiles, network, latestRelease }, use) => {
    // The clock starts at NOW and runs; tests can jump ahead with page.clock.runFor.
    await page.clock.install({ time: NOW });
    await page.addInitScript((files) => {
      // Read by src/e2e-mocks.ts when the app starts.
      (window as unknown as { __E2E_FILES__: typeof files }).__E2E_FILES__ = files;
    }, localFiles);
    // Only the dev server, the data file, and the latest-release API are reachable; any other
    // request fails the test.
    const unexpected: string[] = [];
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "localhost") return route.continue();
      if (url.href.startsWith("https://dev1f965x.github.io/4ghz/data/")) {
        const response = network.current();
        if (response === "offline") return route.abort("internetdisconnected");
        return route.fulfill({ json: response.json });
      }
      if (url.href === "https://api.github.com/repos/dev1f965x/4ghz/releases/latest") {
        if (latestRelease === "none") {
          return route.fulfill({ status: 404, json: { message: "Not Found" } });
        }
        if (latestRelease === "error") return route.fulfill({ status: 500, body: "" });
        return route.fulfill({ json: latestRelease });
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
