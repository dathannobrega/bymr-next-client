import { describe, expect, it } from "vitest";
import {
  coerceBuildingTypeFromRecord,
  describePlacementType,
  listBuildingCatalogTabs,
  listPlacementTypeCatalogEntriesForTab,
  listPlacementTypeCatalogEntries,
  normalizePlacementBuildingTypeInput,
  paginatePlacementTypeCatalogEntries,
} from "../buildingType";

describe("legacy building type normalization", () => {
  it("should normalize aliases and numeric formats", () => {
    expect(normalizePlacementBuildingTypeInput("hq")).toEqual({
      code: 14,
      canonicalType: "hq",
    });
    expect(normalizePlacementBuildingTypeInput("14")).toEqual({
      code: 14,
      canonicalType: "hq",
    });
    expect(normalizePlacementBuildingTypeInput("building-22")).toEqual({
      code: 22,
      canonicalType: "building-22",
    });
    expect(normalizePlacementBuildingTypeInput("building22")).toEqual({
      code: 22,
      canonicalType: "building-22",
    });
    expect(normalizePlacementBuildingTypeInput("bunker")).toEqual({
      code: 22,
      canonicalType: "building-22",
    });
  });

  it("should reject unsupported building codes", () => {
    expect(normalizePlacementBuildingTypeInput("building-999")).toBeNull();
    expect(normalizePlacementBuildingTypeInput("unknown-type")).toBeNull();
  });

  it("should coerce from record fields", () => {
    expect(coerceBuildingTypeFromRecord(undefined, 14)).toBe("hq");
    expect(coerceBuildingTypeFromRecord("building-22", undefined)).toBe("building-22");
    expect(coerceBuildingTypeFromRecord("custom-event", undefined)).toBe("custom-event");
  });

  it("should expose catalog metadata for UI parity", () => {
    const catalog = listPlacementTypeCatalogEntries();
    expect(catalog.some((entry) => entry.code === 14 && entry.canonicalType === "hq")).toBe(true);
    expect(catalog.some((entry) => entry.code === 22 && entry.category === "defense")).toBe(true);

    const hq = describePlacementType("hq");
    expect(hq?.label).toContain("Town Hall");

    const tower = describePlacementType("building-118");
    expect(tower?.legacyClass).toBe("BTOWER");

    const bunker = describePlacementType("building-22");
    expect(bunker?.maxPerYard).toBe(1);
  });

  it("should expose catalog tabs and decoration subtabs", () => {
    const tabs = listBuildingCatalogTabs();
    expect(tabs.map((tab) => tab.id)).toEqual([
      "resources",
      "buildings",
      "defensive",
      "decorations",
    ]);
    expect(
      tabs
        .find((tab) => tab.id === "decorations")
        ?.subTabs?.map((subTab) => subTab.id)
    ).toEqual(["all", "evil", "plants", "good", "flags", "premium"]);
  });

  it("should filter entries by tab and decoration subgroup", () => {
    const resources = listPlacementTypeCatalogEntriesForTab("resources");
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((entry) => entry.tabId === "resources")).toBe(true);

    const plants = listPlacementTypeCatalogEntriesForTab("decorations", "plants");
    expect(plants.some((entry) => entry.code === 7)).toBe(true);
    expect(plants.every((entry) => entry.decorationGroupId === "plants")).toBe(true);

    const premium = listPlacementTypeCatalogEntriesForTab("decorations", "premium");
    expect(premium.some((entry) => entry.code === 52)).toBe(true);
    expect(premium.every((entry) => entry.decorationGroupId === "premium")).toBe(true);
  });

  it("should paginate entries deterministically", () => {
    const buildings = listPlacementTypeCatalogEntriesForTab("buildings");
    const pageZero = paginatePlacementTypeCatalogEntries(buildings, 0, 10);
    expect(pageZero.page).toBe(0);
    expect(pageZero.pageSize).toBe(10);
    expect(pageZero.totalEntries).toBe(buildings.length);
    expect(pageZero.pageEntries.length).toBeLessThanOrEqual(10);

    const clampedLow = paginatePlacementTypeCatalogEntries(buildings, -12, 10);
    expect(clampedLow.page).toBe(0);

    const clampedHigh = paginatePlacementTypeCatalogEntries(buildings, 999, 10);
    expect(clampedHigh.page).toBe(clampedHigh.totalPages - 1);
  });
});
