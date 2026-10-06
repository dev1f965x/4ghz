// Loaded only when Vite runs with --mode e2e (main.tsx). Replaces Tauri IPC with an in-memory
// store, so Playwright tests run the frontend in a browser with chosen local files.
import { mockIPC } from "@tauri-apps/api/mocks";

type StoreFile = "state" | "data-cache";

declare global {
  interface Window {
    /** Set by the Playwright fixture before the page loads; contents of each local file. */
    __E2E_FILES__?: Partial<Record<StoreFile, string>>;
  }
}

export function installE2eMocks() {
  const files = window.__E2E_FILES__ ?? {};
  mockIPC((command, payload) => {
    const args = payload as { file: StoreFile; contents?: string };
    switch (command) {
      case "read_store":
        return files[args.file] ?? null;
      case "write_store":
        files[args.file] = args.contents;
        return null;
      default:
        throw new Error(`No e2e mock for command ${command}`);
    }
  });
}
