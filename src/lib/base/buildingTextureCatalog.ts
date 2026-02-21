import buildingTextureMap from "../../../assets/building-texture-map.json";
import { normalizePlacementBuildingTypeInput } from "./buildingType";

type BuildingTextureMapJson = {
  defaultTexturePath: string;
  fallbackTexturePath: string;
  buildingTexturesByCanonicalType: Record<string, string>;
};

const textureMap = buildingTextureMap as BuildingTextureMapJson;

export const DEFAULT_BUILDING_TEXTURE_PATH = textureMap.defaultTexturePath;
export const FALLBACK_BUILDING_TEXTURE_PATH = textureMap.fallbackTexturePath;

const BUILDING_TEXTURE_BY_CANONICAL_TYPE = Object.freeze({
  ...textureMap.buildingTexturesByCanonicalType,
});

export function resolveBuildingTexturePath(rawType: string): string | null {
  const normalized = normalizePlacementBuildingTypeInput(rawType);
  if (normalized) {
    const direct = BUILDING_TEXTURE_BY_CANONICAL_TYPE[normalized.canonicalType];
    if (direct) return direct;

    const byCode = BUILDING_TEXTURE_BY_CANONICAL_TYPE[`building-${normalized.code}`];
    if (byCode) return byCode;
  }

  const fallbackKey = rawType.trim().toLowerCase();
  return BUILDING_TEXTURE_BY_CANONICAL_TYPE[fallbackKey] ?? null;
}

export function listMappedBuildingTexturePaths(): string[] {
  const unique = new Set<string>();
  unique.add(DEFAULT_BUILDING_TEXTURE_PATH);
  unique.add(FALLBACK_BUILDING_TEXTURE_PATH);

  for (const relativePath of Object.values(BUILDING_TEXTURE_BY_CANONICAL_TYPE)) {
    unique.add(relativePath);
  }

  return [...unique];
}

