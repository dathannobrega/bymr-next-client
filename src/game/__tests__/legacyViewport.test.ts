import { describe, expect, it } from "vitest";
import {
  LEGACY_VIEWPORT_HEIGHT,
  LEGACY_VIEWPORT_WIDTH,
  computeLegacyViewportLayout,
} from "../legacyViewport";

describe("legacy viewport layout", () => {
  it("keeps canonical size at native resolution", () => {
    expect(computeLegacyViewportLayout(LEGACY_VIEWPORT_WIDTH, LEGACY_VIEWPORT_HEIGHT)).toEqual({
      scale: 1,
      cssWidth: LEGACY_VIEWPORT_WIDTH,
      cssHeight: LEGACY_VIEWPORT_HEIGHT,
    });
  });

  it("letterboxes keeping aspect ratio on wide screens", () => {
    expect(computeLegacyViewportLayout(1920, 1080)).toEqual({
      scale: 1080 / LEGACY_VIEWPORT_HEIGHT,
      cssWidth: 1225,
      cssHeight: 1080,
    });
  });

  it("letterboxes keeping aspect ratio on tall screens", () => {
    expect(computeLegacyViewportLayout(900, 1600)).toEqual({
      scale: 900 / LEGACY_VIEWPORT_WIDTH,
      cssWidth: 900,
      cssHeight: 793,
    });
  });
});
