import { describe, expect, it } from "vitest";
import { applyCmdDeltaToBase } from "../cmdDelta";

describe("applyCmdDeltaToBase", () => {
  it("should append building from add delta", () => {
    const next = applyCmdDeltaToBase(
      { yardWidth: 20, yardHeight: 14, buildings: [] },
      [{ op: "addBuilding", id: "b-1", type: "hq", x: 1, y: 2, level: 1 }]
    );

    expect(next.buildings).toHaveLength(1);
    expect(next.buildings[0]).toMatchObject({ id: "b-1", type: "hq", x: 1, y: 2, level: 1 });
  });

  it("should apply move and upgrade to existing building", () => {
    const next = applyCmdDeltaToBase(
      {
        yardWidth: 20,
        yardHeight: 14,
        buildings: [{ id: "b-1", type: "hq", x: 1, y: 2, level: 1 }],
      },
      [
        { op: "moveBuilding", id: "b-1", x: 5, y: 6 },
        { op: "upgradeBuilding", id: "b-1", level: 2 },
      ]
    );

    expect(next.buildings[0]).toMatchObject({ id: "b-1", x: 5, y: 6, level: 2 });
  });
});
