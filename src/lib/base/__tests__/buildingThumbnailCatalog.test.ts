import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH,
  listMappedBuildingCatalogThumbnailPaths,
  resolveBuildingCatalogThumbnailPath,
} from "../buildingThumbnailCatalog";

describe("building catalog thumbnail mapping", () => {
  it("should resolve legacy building button thumbnails for supported catalog entries", () => {
    expect(resolveBuildingCatalogThumbnailPath("hq")).toBe("assets/buildingbuttons/14.1.jpg");
    expect(resolveBuildingCatalogThumbnailPath("building-22")).toBe("assets/buildingbuttons/22.jpg");
    expect(resolveBuildingCatalogThumbnailPath("22")).toBe("assets/buildingbuttons/22.jpg");
  });

  it("should fallback to default thumbnail when no direct mapping exists", () => {
    expect(resolveBuildingCatalogThumbnailPath("building-52")).toBe(
      DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH
    );
    expect(resolveBuildingCatalogThumbnailPath("unknown-building")).toBe(
      DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH
    );
  });

  it("should expose mapped thumbnail paths for sync pipeline usage", () => {
    const paths = listMappedBuildingCatalogThumbnailPaths();
    expect(paths.length).toBeGreaterThan(10);
    expect(paths).toContain("assets/buildingbuttons/22.jpg");
  });
});
