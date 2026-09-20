import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the palette against a change that makes text unreadable.
 *
 * ADR-level promises about contrast rot the moment someone nudges a hex value, so the
 * ratios are computed from the token file itself rather than trusted.
 */
const tokens = readTokens("src/design/tokens.css");

const AA_NORMAL_TEXT = 4.5;
const AA_LARGE_TEXT = 3;

describe("token contrast", () => {
  it.each([
    ["text-strong", "surface-base"],
    ["text-strong", "surface-raised"],
    ["text-body", "surface-base"],
    ["text-body", "surface-raised"],
    ["text-muted", "surface-base"],
    ["text-muted", "surface-raised"],
  ])("%s on %s clears AA for body text", (foreground, background) => {
    expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });

  it.each([
    ["accent", "surface-base"],
    ["live", "surface-raised"],
    ["soon", "surface-raised"],
    ["game-genshin", "surface-raised"],
    ["game-starrail", "surface-raised"],
    ["game-zenless", "surface-raised"],
  ])("%s on %s clears AA for the labels it colors", (foreground, background) => {
    expect(contrastRatio(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(
      AA_LARGE_TEXT,
    );
  });
});

function readTokens(path: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of readFileSync(path, "utf8").matchAll(
    /--([a-z-]+):\s*(#[0-9a-f]{6})/gi,
  )) {
    found[name] = value;
  }
  return found;
}

/** WCAG 2.2 relative luminance and contrast, as defined by the spec. */
function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
