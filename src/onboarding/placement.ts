/** A rectangle in viewport coordinates. */
export interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

interface Placement {
  hole: Hole;
  card: Size;
  viewport: Size;
}

/** Breathing room between the cut-out, the card, and the window edge. */
export const GAP = 16;

/**
 * Where the explanation goes: under the element it describes, or over it when there is
 * no room below; lined up with the element's left edge, or with its right edge when the
 * element sits too far right for the card to open that way. Either way, never past the
 * window.
 */
export function placeCard({ hole, card, viewport }: Placement): { top: number; left: number } {
  return {
    top: cardTop(hole, card.height, viewport.height),
    left: cardLeft(hole, card.width, viewport.width),
  };
}

function cardTop(hole: Hole, height: number, viewportHeight: number): number {
  const below = hole.top + hole.height + GAP;
  if (below + height + GAP <= viewportHeight) return below;

  return clamp(hole.top - GAP - height, GAP, viewportHeight - height - GAP);
}

function cardLeft(hole: Hole, width: number, viewportWidth: number): number {
  const opensRight = hole.left;
  const opensLeft = hole.left + hole.width - width;
  const fitsRight = opensRight + width + GAP <= viewportWidth;

  return clamp(fitsRight ? opensRight : opensLeft, GAP, viewportWidth - width - GAP);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
