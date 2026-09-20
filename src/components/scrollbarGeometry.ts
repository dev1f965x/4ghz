export interface Viewport {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ThumbGeometry {
  offset: number;
  length: number;
}

/** Short thumbs are hard to grab, so they stop shrinking here however long the page is. */
export const MINIMUM_THUMB_PX = 32;

/**
 * Where the thumb sits and how tall it is, or nothing when the content fits.
 *
 * Kept apart from the component because this is the part that can be wrong in a way a
 * reader would notice, and jsdom has no layout to test it through.
 */
export function thumbGeometry(viewport: Viewport): ThumbGeometry | undefined {
  const { scrollTop, scrollHeight, clientHeight } = viewport;
  if (scrollHeight <= clientHeight) return undefined;

  const length = Math.max((clientHeight / scrollHeight) * clientHeight, MINIMUM_THUMB_PX);
  const travel = clientHeight - length;
  const progress = Math.min(Math.max(scrollTop / (scrollHeight - clientHeight), 0), 1);

  return { offset: progress * travel, length };
}

/** How far the content moves for one pixel of thumb travel. */
export function dragScale(viewport: Viewport, thumbLength: number): number {
  const travel = viewport.clientHeight - thumbLength;
  return travel <= 0 ? 0 : (viewport.scrollHeight - viewport.clientHeight) / travel;
}
