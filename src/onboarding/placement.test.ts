import { describe, expect, it } from "vitest";
import { cardTop, GAP } from "./placement";

const hole = { top: 100, left: 40, width: 200, height: 60 };

describe("cardTop", () => {
  it("sits under the highlighted element when there is room", () => {
    expect(cardTop({ hole, cardHeight: 120, viewportHeight: 600 })).toBe(
      hole.top + hole.height + GAP,
    );
  });

  it("flips over the element when the card would fall off the bottom", () => {
    expect(cardTop({ hole: { ...hole, top: 400 }, cardHeight: 120, viewportHeight: 500 })).toBe(
      400 - GAP - 120,
    );
  });

  it("stays inside the window when the element fills it", () => {
    expect(cardTop({ hole: { ...hole, top: 8 }, cardHeight: 400, viewportHeight: 420 })).toBe(GAP);
  });
});
