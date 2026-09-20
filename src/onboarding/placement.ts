/** The rectangle the spotlight cuts out of the dimming, in viewport coordinates. */
export interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Placement {
  hole: Hole;
  cardHeight: number;
  viewportHeight: number;
}

/** Breathing room between the cut-out, the card, and the window edge. */
export const GAP = 16;

/**
 * Puts the explanation under the element it describes, or over it when the element sits
 * too low for the card to fit underneath.
 */
export function cardTop({ hole, cardHeight, viewportHeight }: Placement): number {
  const below = hole.top + hole.height + GAP;
  if (below + cardHeight + GAP <= viewportHeight) return below;

  return Math.max(hole.top - GAP - cardHeight, GAP);
}
