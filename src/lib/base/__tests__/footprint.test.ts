import { describe, expect, it } from "vitest";
import {
  getFootprintCells,
  getLegacyFootprintTilesByCode,
  getLegacyFootprintTilesByType,
} from "../footprint";

describe("legacy footprint migration", () => {
  it("should map known legacy building types to footprint tiles", () => {
    expect(getLegacyFootprintTilesByType("hq")).toEqual({ width: 4, height: 4 });
    expect(getLegacyFootprintTilesByType("building-1")).toEqual({ width: 2, height: 2 });
    expect(getLegacyFootprintTilesByType("building-7")).toEqual({ width: 1, height: 1 });
    expect(getLegacyFootprintTilesByType("building-15")).toEqual({ width: 5, height: 5 });
  });

  it("should fallback to 1x1 for unknown codes", () => {
    expect(getLegacyFootprintTilesByCode(9999)).toEqual({ width: 1, height: 1 });
    expect(getLegacyFootprintTilesByType("custom-event-structure")).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("should enumerate covered cells for a footprint area", () => {
    expect(getFootprintCells(2, 3, { width: 2, height: 2 })).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
  });
});

