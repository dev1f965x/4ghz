// Loaded only when Vite runs with --mode e2e (main.tsx). Replaces Tauri IPC with an in-memory
// store, so Playwright tests run the frontend in a browser with chosen local files.
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";

const storeFiles = ["state", "data-cache"] as const;
type StoreFile = (typeof storeFiles)[number];

declare global {
  interface Window {
    /** Set by the Playwright fixture before the page loads; contents of each local file. */
    __E2E_FILES__?: Partial<Record<StoreFile, string>>;
    /** URLs the app asked the opener plugin to open, for tests to inspect. */
    __E2E_OPENED__?: string[];
    /** Text the app put on the clipboard, for tests to inspect. */
    __E2E_CLIPBOARD__?: string;
    /** While true, write_store fails the way a full disk would. */
    __E2E_WRITE_FAILS__?: boolean;
    /** While true, opening a URL fails, as without a default browser. */
    __E2E_OPEN_FAILS__?: boolean;
    /** Window commands the title bar sent, for tests to inspect. */
    __E2E_WINDOW__?: string[];
    /** How many times the app asked to open its data folder. */
    __E2E_FOLDER_OPENED__?: number;
  }
}

export function installE2eMocks() {
  const files = window.__E2E_FILES__ ?? {};
  // Rejects names the Rust side would not deserialize, so a drift in the payload fails tests.
  const storeFile = (payload: unknown): StoreFile => {
    const file = (payload as { file?: unknown } | undefined)?.file;
    const known = storeFiles.find((name) => name === file);
    if (!known) throw new Error(`Unknown store file ${String(file)}`);
    return known;
  };
  // The custom title bar asks for the current window.
  mockWindows("main");
  mockIPC((command, payload) => {
    switch (command) {
      case "read_store":
        return files[storeFile(payload)] ?? null;
      case "write_store":
        if (window.__E2E_WRITE_FAILS__) throw new Error("Writing failed: disk full");
        files[storeFile(payload)] = (payload as { contents: string }).contents;
        return null;
      // The custom title bar: the browser has no window to move, so these only answer.
      case "plugin:window|is_maximized":
        return false;
      case "plugin:window|minimize":
      case "plugin:window|toggle_maximize":
      case "plugin:window|close":
      case "plugin:window|start_dragging":
      case "plugin:window|internal_toggle_maximize":
        window.__E2E_WINDOW__ = [
          ...(window.__E2E_WINDOW__ ?? []),
          command.slice("plugin:window|".length),
        ];
        return null;
      case "plugin:log|log":
        // Logged errors still reach the console through src/log.ts.
        return null;
      case "data_folder_name":
        return "io.github.dev1f965x.4ghz";
      case "open_data_folder":
        window.__E2E_FOLDER_OPENED__ = (window.__E2E_FOLDER_OPENED__ ?? 0) + 1;
        return null;
      case "plugin:opener|open_url":
        if (window.__E2E_OPEN_FAILS__) throw new Error("No default browser");
        window.__E2E_OPENED__ = [
          ...(window.__E2E_OPENED__ ?? []),
          (payload as { url: string }).url,
        ];
        return null;
      case "plugin:clipboard-manager|write_text":
        window.__E2E_CLIPBOARD__ = (payload as { text: string }).text;
        return null;
      default:
        throw new Error(`No e2e mock for command ${command}`);
    }
  });
}
