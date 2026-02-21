import { describe, expect, it } from "vitest";
import { stateSnapshotToParsedBaseLoad } from "../stateSnapshot";
import type { StateSnapshotResponse } from "../../contracts/state";

describe("stateSnapshotToParsedBaseLoad", () => {
  it("should carry canonical storeData into parsed base state", () => {
    const snapshot: StateSnapshotResponse = {
      snapshotVersion: 1,
      serverTime: 1730000012,
      player: {
        userId: 10,
        username: "tester",
        banned: false,
        chatEnabled: true,
        friendCount: 0,
      },
      base: {
        baseId: "home-1",
        baseSaveId: 7,
        type: "main",
        yardWidth: 20,
        yardHeight: 14,
        yardTheme: "grass",
      },
      progression: {
        level: 4,
        tutorialStage: 0,
        points: 100,
        baseValue: 500,
        empireValue: 400,
        credits: 42,
        protected: 0,
        damage: 0,
        destroyed: 0,
      },
      resources: {
        active: { r1: 1, r2: 2, r3: 3, r4: 4, r1max: 10, r2max: 20, r3max: 30, r4max: 40 },
      },
      storeData: {
        BEW: { q: 1 },
        BUILDING22: { q: 2, e: 1730000999 },
      },
      academy: {
        buildingId: "26",
        buildingLevel: 2,
        busy: true,
        activeMonsterId: "C1",
        monsters: {
          C1: {
            level: 1,
            maxLevel: 6,
            inLocker: true,
            canTrain: false,
            training: {
              startedAt: 1730000000,
              durationSec: 3600,
              completesAt: 1730003600,
              remainingSec: 1200,
              targetLevel: 2,
            },
          },
        },
      },
      buildings: [{ id: "b-1", type: "hq", x: 2, y: 3 }],
      maproom: {
        worldId: "w-1",
        mapVersion: 3,
        outpostCount: 0,
        canAttack: true,
      },
    };

    const parsed = stateSnapshotToParsedBaseLoad(snapshot);
    expect(parsed.credits).toBe(42);
    expect(parsed.storeData?.BEW?.q).toBe(1);
    expect(parsed.storeData?.BUILDING22?.e).toBe(1730000999);
    expect(parsed.academy?.buildingId).toBe("26");
    expect(parsed.academy?.activeMonsterId).toBe("C1");
  });
});
