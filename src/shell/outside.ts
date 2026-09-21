import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * The two ways the app reaches past its window: the clipboard, and the default browser.
 * The capability file lets the browser open only HoYoverse's redemption pages.
 */
export const outside = {
  copy: (text: string) => navigator.clipboard.writeText(text),
  openInBrowser: (url: string) => openUrl(url),
};
