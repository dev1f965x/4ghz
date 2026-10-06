import { defineConfig } from "@playwright/test";

// The app runs in WebView2, which is Microsoft Edge's engine, so tests use the installed Edge
// instead of a downloaded browser.
const themes = ["light", "dark"] as const;
const locales = [
  ["ko", "ko-KR"],
  ["en", "en-US"],
] as const;

// Its own port, so a running pnpm dev (port 1420, without mocks) is never reused by mistake.
const port = 1421;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // The HTML report keeps the screenshots; open it with pnpm exec playwright show-report.
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${port}`, channel: "msedge", trace: "retain-on-failure" },
  projects: locales.flatMap(([name, locale]) =>
    themes.map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { locale, colorScheme },
    })),
  ),
  webServer: {
    // A built bundle, not the dev server, so a cold start has no on-demand compiles to wait for.
    // e2e mode swaps Tauri IPC for mocks (src/e2e-mocks.ts); production builds never include them.
    command: `pnpm exec vite build --mode e2e --outDir dist-e2e && pnpm exec vite preview --mode e2e --outDir dist-e2e --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
