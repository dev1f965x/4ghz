/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
