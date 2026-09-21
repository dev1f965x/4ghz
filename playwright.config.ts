import { defineConfig } from "@playwright/test";

const PORT = 1440;
const CI = Boolean(process.env.CI);

/**
 * End-to-end tests of the interface in a real Chromium: the window's web layer, with
 * Tauri answered by a stand-in (e2e/tauri.ts). Locally they drive the installed Edge;
 * CI installs Chromium. The native shell itself — install, update, window chrome — is
 * outside their reach.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: CI ? undefined : "msedge",
    viewport: { width: 920, height: 640 },
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
  },
});
