import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * The three window operations the custom title bar needs.
 *
 * Wrapped so the shell is reachable as one small module: the components above import
 * this instead of Tauri, which keeps them renderable outside a running window.
 */
export const appWindow = {
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  close: () => getCurrentWindow().close(),
};
