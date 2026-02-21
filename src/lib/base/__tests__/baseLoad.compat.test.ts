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
          cB: 30,
          cU: 120,
          cF: 45,
          fort: 2,
          upgradeToLevel: 3,
          hp: 2200,
          maxHp: 5000,
          repairing: 1,
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
      countdownBuild: 30,
      countdownUpgrade: 120,
      countdownFortify: 45,
      fortification: 2,
      upgradeToLevel: 3,
      hp: 2200,
      maxHp: 5000,
      repairing: true,
    });
  });

  it("should parse yard theme with safe fallback", () => {
    const parsed = parseBaseLoadResponse({ yardTheme: "lava" });
    const fallback = parseBaseLoadResponse({ yardTheme: "unknown-theme" });

    expect(parsed.yardTheme).toBe("lava");
    expect(fallback.yardTheme).toBeUndefined();
  });

  it("should parse credits and store inventory data", () => {
    const parsed = parseBaseLoadResponse({
      credits: 321,
      storeData: {
        hod: { q: 2, e: 1730003612 },
        invalid: { q: -1 },
      },
    });

    expect(parsed.credits).toBe(321);
    expect(parsed.storeData).toEqual({
      HOD: { q: 2, e: 1730003612 },
    });
  });

  it("should parse progression and repair summaries", () => {
    const parsed = parseBaseLoadResponse({
      progression: {
        level: 5,
        tutorialStage: 1,
        points: 1500,
        baseValue: 2000,
        empireValue: 4500,
        protected: 1,
        damage: 100,
        destroyed: 10,
      },
      repair: {
        estimatedDurationSec: 600,
        repairingCount: 2,
        damagedCount: 3,
      },
    });

    expect(parsed.progression).toMatchObject({
      level: 5,
      points: 1500,
      baseValue: 2000,
      empireValue: 4500,
    });
    expect(parsed.repair).toEqual({
      estimatedDurationSec: 600,
      repairingCount: 2,
      damagedCount: 3,
    });
  });

  it("should parse academy canonical summary", () => {
    const parsed = parseBaseLoadResponse({
      academy: {
        buildingId: "26",
        buildingLevel: 3,
        busy: true,
        activeMonsterId: "C1",
        monsters: {
          C1: {
            level: 2,
            maxLevel: 6,
            inLocker: true,
            canTrain: false,
            training: {
              startedAt: 1730000000,
              durationSec: 7200,
              completesAt: 1730007200,
              remainingSec: 3600,
              targetLevel: 3,
            },
          },
        },
      },
    });

    expect(parsed.academy?.buildingId).toBe("26");
    expect(parsed.academy?.activeMonsterId).toBe("C1");
    expect(parsed.academy?.monsters.C1?.training?.durationSec).toBe(7200);
  });
});
