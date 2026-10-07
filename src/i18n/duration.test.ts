import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { formatSeconds } from "./duration";

// Renders units like the English strings: "5d", "18h", "07m", "05s".
const suffix = { day: "d", hour: "h", minute: "m", second: "s" } as const;
const t = ((key: string, values: { n: string }) =>
  `${values.n}${suffix[key.split(".").at(-1) as keyof typeof suffix]}`) as unknown as TFunction;
const at = (seconds: number) => formatSeconds(t, 0, seconds * 1000);

describe("formatSeconds", () => {
  it("starts at the largest unit present and pads the rest", () => {
    expect(at(5 * 86_400 + 18 * 3600 + 7 * 60 + 5)).toBe("5d 18h 07m 05s");
    expect(at(3600)).toBe("1h 00m 00s");
    expect(at(65)).toBe("1m 05s");
    expect(at(9)).toBe("9s");
  });

  it("rounds a part second down and stops at zero", () => {
    expect(formatSeconds(t, 0, 1999)).toBe("1s");
    expect(formatSeconds(t, 5000, 0)).toBe("0s");
  });
});
