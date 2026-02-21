import { describe, expect, it } from "vitest";
import { applyCmdDeltaToBase } from "../cmdDelta";

describe("applyCmdDeltaToBase", () => {
  it("should append building from add delta", () => {
    const next = applyCmdDeltaToBase(
      { yardWidth: 20, yardHeight: 14, buildings: [] },
      [
        {
          op: "addBuilding",
          id: "b-1",
          type: "hq",
          x: 1,
          y: 2,
          level: 1,
          footprintW: 4,
          footprintH: 4,
        },
      ]
    );

    expect(next.buildings).toHaveLength(1);
    expect(next.buildings[0]).toMatchObject({
      id: "b-1",
      type: "hq",
      x: 1,
      y: 2,
      level: 1,
      footprintW: 4,
      footprintH: 4,
    });
  });

  it("should apply move and upgrade to existing building", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [{ id: "b-1", type: "hq", x: 1, y: 2, level: 1 }],
      },
      [
        { op: "moveBuilding", id: "b-1", x: 5, y: 6, footprintW: 4, footprintH: 4 },
        { op: "upgradeBuilding", id: "b-1", level: 2 },
      ]
    );

    expect(next.buildings[0]).toMatchObject({
      id: "b-1",
      x: 5,
      y: 6,
      level: 2,
      footprintW: 4,
      footprintH: 4,
    });
  });

  it("should track start/cancel upgrade deltas", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [{ id: "b-1", type: "hq", x: 1, y: 2, level: 1 }],
      },
      [
        { op: "startUpgrade", id: "b-1", toLevel: 2, remainingSec: 120 },
        { op: "cancelUpgrade", id: "b-1" },
      ]
    );

    expect(next.buildings[0]).toMatchObject({
      id: "b-1",
      level: 1,
      countdownUpgrade: undefined,
      upgradeToLevel: undefined,
    });
  });

  it("should apply resource snapshot delta", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [],
      },
      [
        {
          op: "setResources",
          resources: {
            r1: 100,
            r2: 200,
            r3: 300,
            r4: 400,
            r1max: 1000,
            r2max: 1000,
            r3max: 1000,
            r4max: 1000,
          },
        },
      ]
    );

    expect(next.resources).toMatchObject({ r1: 100, r2: 200, r3: 300, r4: 400 });
  });

  it("should apply credits and store inventory deltas", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [],
        credits: 25,
      },
      [
        { op: "setCredits", credits: 123 },
        { op: "setStoreItem", item: "HOD", q: 2, e: 1730003612 },
      ]
    );

    expect(next.credits).toBe(123);
    expect(next.storeData?.HOD).toEqual({ q: 2, e: 1730003612 });
  });

  it("should apply academy snapshot delta", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [],
      },
      [
        {
          op: "setAcademyState",
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
        },
      ]
    );

    expect(next.academy?.buildingId).toBe("26");
    expect(next.academy?.activeMonsterId).toBe("C1");
    expect(next.academy?.monsters.C1?.training?.remainingSec).toBe(3600);
  });

  it("should apply repair state delta to existing building", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [{ id: "b-1", type: "hq", x: 1, y: 2, hp: 1200, maxHp: 5000 }],
      },
      [{ op: "setBuildingRepairState", id: "b-1", hp: 1200, maxHp: 5000, repairing: true }]
    );

    expect(next.buildings[0]).toMatchObject({
      id: "b-1",
      hp: 1200,
      maxHp: 5000,
      repairing: true,
    });
  });
});
