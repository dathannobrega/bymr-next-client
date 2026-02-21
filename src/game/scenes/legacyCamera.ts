import {
  LEGACY_VIEWPORT_HEIGHT,
  LEGACY_VIEWPORT_WIDTH,
} from "../legacyViewport";

export type LegacyCameraViewport = {
  width: number;
  height: number;
};

export type LegacyCameraPoint = {
  x: number;
  y: number;
};

export type LegacyPanBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export const LEGACY_SCREEN_INIT_WIDTH = LEGACY_VIEWPORT_WIDTH;
export const LEGACY_SCREEN_INIT_HEIGHT = LEGACY_VIEWPORT_HEIGHT;

export const LEGACY_ZOOM_DEFAULT_SCALE = 1;
export const LEGACY_ZOOM_TOGGLE_SCALE = 0.5;
export const LEGACY_WHEEL_MAGNIFICATION_STEP = 0.05;
export const LEGACY_WHEEL_MAGNIFICATION_MIN = 0.6;
export const LEGACY_WHEEL_MAGNIFICATION_MAX = 2.75;

const LEGACY_MAP_SCROLL_LIMITS = {
  left: -1615,
  right: 2375,
  top: -650,
  bottom: 1325,
} as const;

const LEGACY_ZOOMED_VIEWPORT_BIAS = {
  width: 760,
  height: 670,
  divisor: 2,
} as const;

export function computeLegacyPanBounds(
  viewport: LegacyCameraViewport,
  zoomed: boolean
): LegacyPanBounds {
  const width = Math.max(1, Math.trunc(viewport.width));
  const height = Math.max(1, Math.trunc(viewport.height));
  const halfW = width / 2;
  const halfH = height / 2;

  let minX = LEGACY_MAP_SCROLL_LIMITS.left + halfW;
  let maxX = LEGACY_MAP_SCROLL_LIMITS.right - halfW;
  let minY = LEGACY_MAP_SCROLL_LIMITS.top + halfH;
  let maxY = LEGACY_MAP_SCROLL_LIMITS.bottom - halfH;

  if (zoomed) {
    const divisor = LEGACY_ZOOMED_VIEWPORT_BIAS.divisor;
    minX =
      (LEGACY_MAP_SCROLL_LIMITS.left +
        width +
        LEGACY_ZOOMED_VIEWPORT_BIAS.width / divisor) /
      divisor;
    maxX =
      (LEGACY_MAP_SCROLL_LIMITS.right -
        width +
        LEGACY_ZOOMED_VIEWPORT_BIAS.width / divisor) /
      divisor;
    minY =
      (LEGACY_MAP_SCROLL_LIMITS.top +
        height +
        LEGACY_ZOOMED_VIEWPORT_BIAS.height / divisor) /
      divisor;
    maxY =
      (LEGACY_MAP_SCROLL_LIMITS.bottom -
        height +
        LEGACY_ZOOMED_VIEWPORT_BIAS.height / divisor) /
      divisor;
  }

  return {
    ...normalizeAxisBounds(minX, maxX, minY, maxY),
  };
}

export function clampLegacyCameraTarget(
  point: LegacyCameraPoint,
  viewport: LegacyCameraViewport,
  zoomed: boolean
): LegacyCameraPoint {
  const bounds = computeLegacyPanBounds(viewport, zoomed);
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

export function stepLegacyCameraAxis(
  current: number,
  target: number,
  snapThreshold: number = 2
): number {
  const eased = current + (target - current) * 0.5;
  if (Math.abs(target - eased) <= snapThreshold) {
    return target;
  }
  return eased;
}

function normalizeAxisBounds(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): LegacyPanBounds {
  if (minX > maxX) {
    const centerX = (minX + maxX) / 2;
    minX = centerX;
    maxX = centerX;
  }

  if (minY > maxY) {
    const centerY = (minY + maxY) / 2;
    minY = centerY;
    maxY = centerY;
  }

  return { minX, maxX, minY, maxY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
