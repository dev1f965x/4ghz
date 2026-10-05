import { describe, expect, it } from "vitest";
import { detectLocale } from "./locale";

describe("detectLocale", () => {
  it.each([
    [undefined, ["ko-KR"], "ko"],
    [undefined, ["en-US", "ko-KR"], "en"],
    [undefined, ["ja-JP", "ko"], "ko"],
    [undefined, ["ja-JP"], "en"],
    [undefined, [], "en"],
    ["en", ["ko-KR"], "en"],
  ] as const)("stored %s with %j gives %s", (stored, languages, expected) => {
    expect(detectLocale(stored, languages)).toBe(expected);
  });
});
