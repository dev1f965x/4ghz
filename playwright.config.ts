import { defineConfig } from "@playwright/test";

// The app runs in WebView2, which is Microsoft Edge's engine, so tests use the installed Edge
// instead of a downloaded browser.
const themes = ["light", "dark"] as const;
const locales = [
  ["ko", "ko-KR"],
  ["en", "en-US"],
] as const;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: "http://localhost:1420", channel: "msedge", trace: "retain-on-failure" },
  projects: locales.flatMap(([name, locale]) =>
    themes.map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { locale, colorScheme },
    })),
  ),
  webServer: {
    // e2e mode swaps Tauri IPC for mocks (src/e2e-mocks.ts); production builds never include them.
    command: "pnpm exec vite --mode e2e",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
  },
});
