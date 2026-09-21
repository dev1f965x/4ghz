import { describe, expect, it } from "vitest";
import { GAP, placeCard } from "./placement";

const viewport = { width: 800, height: 600 };
const card = { width: 320, height: 120 };

describe("placeCard", () => {
  it("opens below and to the right of an element with room on both sides", () => {
    const hole = { top: 100, left: 40, width: 200, height: 60 };

    expect(placeCard({ hole, card, viewport })).toEqual({ top: 100 + 60 + GAP, left: 40 });
  });

  it("flips above an element near the bottom", () => {
    const hole = { top: 440, left: 40, width: 200, height: 60 };

    expect(placeCard({ hole, card, viewport }).top).toBe(440 - GAP - 120);
  });

  it("opens leftward from an element against the right edge", () => {
    const hole = { top: 20, left: 680, width: 104, height: 36 };
    const { left } = placeCard({ hole, card, viewport });

    expect(left).toBe(680 + 104 - 320);
    expect(left + card.width).toBeLessThanOrEqual(viewport.width - GAP);
  });

  it("stays inside a window narrower than the card allows", () => {
    const hole = { top: 20, left: 300, width: 40, height: 36 };
    const { left } = placeCard({ hole, card, viewport: { width: 340, height: 600 } });

    expect(left).toBe(GAP);
  });

  it("stays inside the window when the element fills it", () => {
    const hole = { top: 8, left: 8, width: 784, height: 584 };
    const { top } = placeCard({ hole, card, viewport });

    expect(top).toBeGreaterThanOrEqual(GAP);
    expect(top + card.height).toBeLessThanOrEqual(viewport.height - GAP);
  });
});
