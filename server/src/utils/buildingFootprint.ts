export type BuildingFootprint = {
  width: number;
  height: number;
};

const DEFAULT_FOOTPRINT: BuildingFootprint = { width: 1, height: 1 };

type LegacyFootprintPx = {
  widthPx: number;
  heightPx: number;
};

// Derived from legacy ActionScript constructors (`client(legacy)/scripts/BUILDING*.as`).
const LEGACY_FOOTPRINTS_PX_BY_CODE: Record<number, LegacyFootprintPx> = {
  1: { widthPx: 70, heightPx: 70 },
  2: { widthPx: 70, heightPx: 70 },
  3: { widthPx: 70, heightPx: 70 },
  4: { widthPx: 70, heightPx: 70 },
  5: { widthPx: 90, heightPx: 90 },
  6: { widthPx: 80, heightPx: 80 },
  7: { widthPx: 30, heightPx: 30 },
  8: { widthPx: 100, heightPx: 100 },
  9: { widthPx: 80, heightPx: 80 },
  10: { widthPx: 100, heightPx: 100 },
  11: { widthPx: 90, heightPx: 90 },
  12: { widthPx: 70, heightPx: 70 },
  14: { widthPx: 130, heightPx: 130 },
  15: { widthPx: 160, heightPx: 160 },
  17: { widthPx: 20, heightPx: 20 },
  18: { widthPx: 20, heightPx: 20 },
  19: { widthPx: 80, heightPx: 80 },
  20: { widthPx: 70, heightPx: 70 },
  21: { widthPx: 70, heightPx: 70 },
  22: { widthPx: 90, heightPx: 90 },
  23: { widthPx: 70, heightPx: 70 },
  24: { widthPx: 20, heightPx: 20 },
  25: { widthPx: 70, heightPx: 70 },
  26: { widthPx: 100, heightPx: 100 },
  27: { widthPx: 140, heightPx: 140 },
  51: { widthPx: 90, heightPx: 90 },
  52: { widthPx: 40, heightPx: 40 },
  112: { widthPx: 130, heightPx: 130 },
  113: { widthPx: 80, heightPx: 80 },
  115: { widthPx: 70, heightPx: 70 },
  117: { widthPx: 20, heightPx: 20 },
  118: { widthPx: 70, heightPx: 70 },
};

export function getLegacyFootprintTilesByCode(
  code: number | null | undefined
): BuildingFootprint {
  if (!Number.isFinite(code)) return DEFAULT_FOOTPRINT;

  const normalizedCode = Math.trunc(code as number);
  const fromLegacy = LEGACY_FOOTPRINTS_PX_BY_CODE[normalizedCode];
  if (!fromLegacy) return DEFAULT_FOOTPRINT;

  return {
    width: legacyPixelsToGridTiles(fromLegacy.widthPx),
    height: legacyPixelsToGridTiles(fromLegacy.heightPx),
  };
}

export function isFootprintWithinBounds(
  x: number,
  y: number,
  footprint: BuildingFootprint,
  yardWidth: number,
  yardHeight: number
): boolean {
  return x >= 0 && y >= 0 && x + footprint.width <= yardWidth && y + footprint.height <= yardHeight;
}

export function footprintsOverlap(
  aX: number,
  aY: number,
  aFootprint: BuildingFootprint,
  bX: number,
  bY: number,
  bFootprint: BuildingFootprint
): boolean {
  const aMaxX = aX + aFootprint.width - 1;
  const aMaxY = aY + aFootprint.height - 1;
  const bMaxX = bX + bFootprint.width - 1;
  const bMaxY = bY + bFootprint.height - 1;

  return aX <= bMaxX && bX <= aMaxX && aY <= bMaxY && bY <= aMaxY;
}

function legacyPixelsToGridTiles(px: number): number {
  if (!Number.isFinite(px) || px <= 0) return 1;
  if (px <= 40) return 1;
  return Math.max(1, Math.round(px / 30));
}

