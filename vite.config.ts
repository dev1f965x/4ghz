/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Ships the e2e data file with test builds of the app; see .env.app-e2e. */
function e2eDataFile(): Plugin {
  return {
    name: "e2e-data-file",
    apply: (_, env) => env.mode === "app-e2e",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "e2e-data/v1.json",
        source: readFileSync(new URL("./e2e/fixtures/data.json", import.meta.url), "utf8"),
      });
    },
  };
}

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react(), tailwindcss(), e2eDataFile()],
  // The version the About screen shows and the update check compares; tauri.conf.json reads
  // the same package.json, so the two cannot differ.
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // The bundle loads from the installed app, not over a network, so the web-oriented 500 kB
    // warning does not apply; startup is measured instead (e2e/app-smoke.mjs). The limit still
    // flags an unexpected jump in size.
    chunkSizeWarningLimit: 700,
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Unit tests live next to the code; e2e/ holds Playwright tests, which Vitest must not run.
  test: { include: ["src/**/*.test.{ts,tsx}"] },
  // Keep Rust compiler errors visible in the terminal.
  clearScreen: false,
  server: {
    // Tauri loads the dev server from this fixed port (tauri.conf.json devUrl).
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
