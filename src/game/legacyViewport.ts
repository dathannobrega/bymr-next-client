export const LEGACY_VIEWPORT_WIDTH = 760;
export const LEGACY_VIEWPORT_HEIGHT = 670;

export type LegacyViewportLayout = {
  scale: number;
  cssWidth: number;
  cssHeight: number;
};

export function computeLegacyViewportLayout(
  windowWidth: number,
  windowHeight: number
): LegacyViewportLayout {
  const safeWindowWidth = Math.max(1, Math.floor(windowWidth));
  const safeWindowHeight = Math.max(1, Math.floor(windowHeight));

  const scale = Math.max(
    0.1,
    Math.min(
      safeWindowWidth / LEGACY_VIEWPORT_WIDTH,
      safeWindowHeight / LEGACY_VIEWPORT_HEIGHT
    )
  );

  return {
    scale,
    cssWidth: Math.max(1, Math.round(LEGACY_VIEWPORT_WIDTH * scale)),
    cssHeight: Math.max(1, Math.round(LEGACY_VIEWPORT_HEIGHT * scale)),
  };
}
