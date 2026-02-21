import { describe, expect, it } from "vitest";
import {
  clampLegacyCameraTarget,
  computeLegacyPanBounds,
  stepLegacyCameraAxis,
} from "../legacyCamera";

describe("legacy camera bounds parity", () => {
  it("matches MAP.as bounds for default viewport in non-zoomed mode", () => {
    const bounds = computeLegacyPanBounds({ width: 760, height: 670 }, false);
    expect(bounds).toEqual({
      minX: -1235,
      maxX: 1995,
      minY: -315,
      maxY: 990,
    });
  });

  it("matches MAP.as bounds for default viewport in zoomed mode", () => {
    const bounds = computeLegacyPanBounds({ width: 760, height: 670 }, true);
    expect(bounds).toEqual({
      minX: -237.5,
      maxX: 997.5,
      minY: 177.5,
      maxY: 495,
    });
  });

  it("clamps targets to legacy bounds", () => {
    expect(
      clampLegacyCameraTarget({ x: -99999, y: 99999 }, { width: 760, height: 670 }, false)
    ).toEqual({
      x: -1235,
      y: 990,
    });
  });

  it("collapses invalid bounds when viewport is larger than map limits", () => {
    const bounds = computeLegacyPanBounds({ width: 5000, height: 3000 }, false);
    expect(bounds).toEqual({
      minX: 380,
      maxX: 380,
      minY: 337.5,
      maxY: 337.5,
    });
  });
});

describe("legacy camera smoothing", () => {
  it("snaps when close enough to target", () => {
    expect(stepLegacyCameraAxis(100, 101.9)).toBe(101.9);
  });

  it("eases halfway when far from target", () => {
    expect(stepLegacyCameraAxis(0, 100)).toBe(50);
  });
});
