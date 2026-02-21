import thumbnailMapRaw from "../../../assets/building-thumbnail-map.json";
import { normalizePlacementBuildingTypeInput } from "./buildingType";

type ThumbnailCatalogFile = {
  defaultThumbnailPath?: unknown;
  thumbnailByCanonicalType?: unknown;
};

const thumbnailMap = thumbnailMapRaw as ThumbnailCatalogFile;

const DEFAULT_THUMBNAIL_PATH =
  typeof thumbnailMap.defaultThumbnailPath === "string" &&
  thumbnailMap.defaultThumbnailPath.trim().length > 0
    ? thumbnailMap.defaultThumbnailPath.trim()
    : "assets/yard/building-placeholder.png";

const THUMBNAIL_BY_CANONICAL_TYPE: Record<string, string> = resolveThumbnailMap(
  thumbnailMap.thumbnailByCanonicalType
);

export const DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH = DEFAULT_THUMBNAIL_PATH;

export function resolveBuildingCatalogThumbnailPath(rawType: string): string {
  const normalized = normalizePlacementBuildingTypeInput(rawType);
  if (!normalized) {
    return DEFAULT_THUMBNAIL_PATH;
  }

  return THUMBNAIL_BY_CANONICAL_TYPE[normalized.canonicalType] ?? DEFAULT_THUMBNAIL_PATH;
}

export function listMappedBuildingCatalogThumbnailPaths(): string[] {
  return [...new Set(Object.values(THUMBNAIL_BY_CANONICAL_TYPE))];
}

function resolveThumbnailMap(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [rawKey, rawPath] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawPath !== "string") continue;
    const normalized = normalizePlacementBuildingTypeInput(rawKey);
    if (!normalized) continue;
    const path = rawPath.trim();
    if (!path) continue;
    out[normalized.canonicalType] = path;
  }

  return out;
}
