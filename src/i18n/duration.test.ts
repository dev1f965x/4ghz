import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { formatClock } from "./duration";

// Renders the days pattern as "{d}d {clock}", like the English string.
const t = ((key: string, values: { d: number; clock: string }) =>
  key === "duration.daysClock" ? `${values.d}d ${values.clock}` : key) as unknown as TFunction;
const at = (seconds: number) => formatClock(t, 0, seconds * 1000);

describe("formatClock", () => {
  it("shows hours, minutes, and seconds under a day", () => {
    expect(at(0)).toBe("00:00:00");
    expect(at(59)).toBe("00:00:59");
    expect(at(86_399)).toBe("23:59:59");
  });

  it("adds days from a full day on", () => {
    expect(at(86_400)).toBe("1d 00:00:00");
    expect(at(5 * 86_400 + 18 * 3600 + 18 * 60)).toBe("5d 18:18:00");
  });

  it("rounds a part second down and stops at zero", () => {
    expect(formatClock(t, 0, 1999)).toBe("00:00:01");
    expect(formatClock(t, 5000, 0)).toBe("00:00:00");
  });
});
