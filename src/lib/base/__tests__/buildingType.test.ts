import { describe, expect, it } from "vitest";
import {
  coerceBuildingTypeFromRecord,
  describePlacementType,
  listPlacementTypeCatalogEntries,
  normalizePlacementBuildingTypeInput,
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
  });
});
