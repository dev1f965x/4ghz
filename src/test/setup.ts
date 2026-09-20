import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

/**
 * The window API only exists inside a running Tauri shell. Components reach it through
 * `src/shell/window.ts`, which is stubbed here so rendering never touches the real one.
 */
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
  }),
}));

/** jsdom has no media queries; nothing under test asks for reduced motion. */
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as MediaQueryList;
