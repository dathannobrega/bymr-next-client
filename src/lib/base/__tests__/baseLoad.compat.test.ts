import { describe, expect, it } from "vitest";
import { parseBaseLoadResponse } from "../baseLoad";

describe("parseBaseLoadResponse legacy compatibility", () => {
  it("should parse legacy buildingdata objects into normalized buildings", () => {
    const parsed = parseBaseLoadResponse({
      buildingdata: {
        "0": { id: 0, t: 14, X: 2, Y: 3, l: 2 },
        "1": { id: 1, type: "hq", x: 4, y: 5, level: 3 },
      },
    });

    expect(parsed.buildings).toEqual([
      { id: "0", type: "hq", x: 2, y: 3, level: 2 },
      { id: "1", type: "hq", x: 4, y: 5, level: 3 },
    ]);
  });

  it("should ignore out-of-bounds legacy building coordinates", () => {
    const parsed = parseBaseLoadResponse({
      yardWidth: 20,
      yardHeight: 14,
      buildingdata: {
        "0": { id: 0, t: 14, X: -1, Y: 3, l: 2 },
        "1": { id: 1, t: 14, X: 21, Y: 3, l: 2 },
        "2": { id: 2, t: 14, X: 5, Y: 6, l: 2 },
      },
    });

    expect(parsed.buildings).toEqual([{ id: "2", type: "hq", x: 5, y: 6, level: 2 }]);
  });

  it("should keep unsupported custom string types from legacy payload", () => {
    const parsed = parseBaseLoadResponse({
      buildingdata: {
        "9": { id: 9, type: "custom-event-structure", X: 1, Y: 1 },
      },
    });

    expect(parsed.buildings).toEqual([
      { id: "9", type: "custom-event-structure", x: 1, y: 1, level: undefined },
    ]);
  });

  it("should parse optional resources and upgrade metadata", () => {
    const parsed = parseBaseLoadResponse({
      resources: {
        r1: 50,
        r2: 60,
        r3: 70,
        r4: 80,
        r1max: 1000,
        r2max: 1000,
        r3max: 1000,
        r4max: 1000,
      },
      buildings: [
        {
          id: "b-1",
          type: "hq",
          x: 1,
          y: 1,
          level: 2,
          cU: 120,
          upgradeToLevel: 3,
          footprintW: 4,
          footprintH: 4,
        },
      ],
    });

    expect(parsed.resources).toMatchObject({ r1: 50, r2: 60, r3: 70, r4: 80 });
    expect(parsed.buildings[0]).toMatchObject({
      id: "b-1",
      footprintW: 4,
      footprintH: 4,
      countdownUpgrade: 120,
      upgradeToLevel: 3,
    });
  });

  it("should parse yard theme with safe fallback", () => {
    const parsed = parseBaseLoadResponse({ yardTheme: "lava" });
    const fallback = parseBaseLoadResponse({ yardTheme: "unknown-theme" });

    expect(parsed.yardTheme).toBe("lava");
    expect(fallback.yardTheme).toBeUndefined();
  });
});
