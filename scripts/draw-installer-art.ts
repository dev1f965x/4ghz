import { writeFileSync } from "node:fs";

/**
 * Draws the installer's bitmaps from the same palette and bars as the brand mark.
 *
 * NSIS wants 24-bit BMPs at fixed sizes, and the shapes are only rounded rectangles, so
 * they are rasterised here directly rather than through an image library.
 *
 *   npx tsx scripts/draw-installer-art.ts
 */

type Rgb = readonly [number, number, number];

const palette = {
  surface: hex("#0e0f13"),
  plate: hex("#16181f"),
  plateEdge: hex("#262933"),
  white: hex("#ffffff"),
  genshin: hex("#6fb6ff"),
  starrail: hex("#b79cff"),
  zenless: hex("#ffb35c"),
};

interface RoundedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: Rgb;
}

/** The three bars of the mark in its 40-unit grid: x, y, width, height. */
const BARS: readonly [number, number, number, number, Rgb][] = [
  [11, 22, 5, 9, palette.genshin],
  [18, 16, 5, 15, palette.starrail],
  [25, 9, 5, 22, palette.zenless],
];

/** Welcome and finish pages: the bars grown large, rising out of the bottom edge. */
function sidebar(): RoundedRect[] {
  const scale = 7;
  const left = (164 - 19 * scale) / 2;

  return BARS.map(([x, , width, height, color]) => ({
    x: left + (x - 11) * scale,
    y: 314 - height * scale,
    width: width * scale,
    height: (height + width) * scale,
    radius: (width * scale) / 2,
    color,
  }));
}

/** Inner pages: the app icon at the right of the white header. */
function header(): RoundedRect[] {
  const size = 40;
  const x = 150 - size - 8;
  const y = (57 - size) / 2;

  return [
    { x: x - 1, y: y - 1, width: size + 2, height: size + 2, radius: 10, color: palette.plateEdge },
    { x, y, width: size, height: size, radius: 9, color: palette.plate },
    ...BARS.map(([bx, by, width, height, color]) => ({
      x: x + bx,
      y: y + by,
      width,
      height,
      radius: width / 2,
      color,
    })),
  ];
}

function paint(width: number, height: number, background: Rgb, shapes: RoundedRect[]): Rgb[] {
  const pixels: Rgb[] = Array.from({ length: width * height }, () => background);

  for (const shape of shapes) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const coverage = cover(shape, x + 0.5, y + 0.5);
        if (coverage === 0) continue;
        pixels[y * width + x] = mix(pixels[y * width + x], shape.color, coverage);
      }
    }
  }
  return pixels;
}

/** How much of the pixel centred at (px, py) the shape covers, from its signed distance. */
function cover(shape: RoundedRect, px: number, py: number): number {
  const halfWidth = shape.width / 2;
  const halfHeight = shape.height / 2;
  const qx = Math.abs(px - (shape.x + halfWidth)) - (halfWidth - shape.radius);
  const qy = Math.abs(py - (shape.y + halfHeight)) - (halfHeight - shape.radius);
  const distance =
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - shape.radius;

  return Math.min(Math.max(0.5 - distance, 0), 1);
}

function mix(under: Rgb, over: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) =>
    Math.round(under[i] + (over[i] - under[i]) * amount),
  ) as unknown as Rgb;
}

/** 24-bit bottom-up BMP, the one layout every NSIS build reads. */
function bmp(width: number, height: number, pixels: Rgb[]): Buffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const file = Buffer.alloc(54 + imageSize);

  file.write("BM", 0);
  file.writeUInt32LE(54 + imageSize, 2);
  file.writeUInt32LE(54, 10);
  file.writeUInt32LE(40, 14);
  file.writeInt32LE(width, 18);
  file.writeInt32LE(height, 22);
  file.writeUInt16LE(1, 26);
  file.writeUInt16LE(24, 28);
  file.writeUInt32LE(imageSize, 34);

  for (let y = 0; y < height; y++) {
    const row = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixels[y * width + x];
      file.writeUInt8(b, row + x * 3);
      file.writeUInt8(g, row + x * 3 + 1);
      file.writeUInt8(r, row + x * 3 + 2);
    }
  }
  return file;
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

writeFileSync(
  "src-tauri/installer/sidebar.bmp",
  bmp(164, 314, paint(164, 314, palette.surface, sidebar())),
);
writeFileSync(
  "src-tauri/installer/header.bmp",
  bmp(150, 57, paint(150, 57, palette.white, header())),
);
console.log("src-tauri/installer/{sidebar,header}.bmp");
