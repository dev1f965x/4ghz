import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        // Wiring and shell adapters: they only exist to hand Tauri's APIs to the code
        // above, and running them needs a live window rather than jsdom.
        "src/main.tsx",
        "src/feed/tauri.ts",
        "src/feed/sample.ts",
        "src/shell/window.ts",
        "src/onboarding/memory.ts",
        "src/update/tauri.ts",
        "src/codes/usedCodes.ts",
        "src/shell/outside.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
