import { describe, expect, it } from "vitest";
import { dragScale, MINIMUM_THUMB_PX, thumbGeometry } from "./scrollbarGeometry";

const viewport = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 };

describe("thumbGeometry", () => {
  it("stays away when everything already fits", () => {
    expect(thumbGeometry({ scrollTop: 0, scrollHeight: 400, clientHeight: 500 })).toBeUndefined();
  });

  it("sizes the thumb to the share of content on screen", () => {
    expect(thumbGeometry(viewport)?.length).toBe(125);
  });

  it("never shrinks below a grabbable size", () => {
    const long = { scrollTop: 0, scrollHeight: 100_000, clientHeight: 500 };

    expect(thumbGeometry(long)?.length).toBe(MINIMUM_THUMB_PX);
  });

  it("sits at the top when nothing is scrolled", () => {
    expect(thumbGeometry(viewport)?.offset).toBe(0);
  });

  it("reaches the bottom of its travel at the end of the content", () => {
    const atEnd = { ...viewport, scrollTop: 1500 };
    const { offset, length } = thumbGeometry(atEnd) ?? { offset: 0, length: 0 };

    expect(offset + length).toBe(viewport.clientHeight);
  });

  it("ignores overscroll past either end", () => {
    expect(thumbGeometry({ ...viewport, scrollTop: -80 })?.offset).toBe(0);
    expect(thumbGeometry({ ...viewport, scrollTop: 9999 })?.offset).toBe(375);
  });
});

describe("dragScale", () => {
  it("maps thumb travel onto content travel", () => {
    expect(dragScale(viewport, 125)).toBe(4);
  });

  it("refuses to divide by a thumb that fills the track", () => {
    expect(dragScale(viewport, 500)).toBe(0);
  });
});
