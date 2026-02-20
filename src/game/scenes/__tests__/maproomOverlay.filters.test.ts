import { describe, expect, it } from "vitest";

import {
  classifyMaproomCell,
  matchesCellFilter,
  parseMaproomJumpInput,
  type MaproomCellFilterMode,
} from "../MaproomOverlay";
import type { WorldmapV3Cell } from "../../../lib/contracts/maproom";

function createCell(overrides: Partial<WorldmapV3Cell> = {}): WorldmapV3Cell {
  return {
    n: "test",
    uid: 123,
    bid: "b-1",
    tid: 0,
    x: 10,
    y: 10,
    aid: 0,
    l: 5,
    pl: 0,
    r: {},
    dm: 0,
    rel: 0,
    lo: 0,
    fr: 0,
    p: 0,
    d: 0,
    t: 0,
    fbid: "",
    b: 0,
    i: 0,
    m: [],
    ...overrides,
  };
}

describe("MaproomOverlay filter helpers", () => {
  it("should classify cell role as mine/enemy/free", () => {
    expect(classifyMaproomCell(createCell({ uid: 10 }), 10)).toBe("mine");
    expect(classifyMaproomCell(createCell({ uid: 11 }), 10)).toBe("enemy");
    expect(classifyMaproomCell(createCell({ uid: 0 }), 10)).toBe("free");
    expect(classifyMaproomCell(undefined, 10)).toBe("free");
  });

  it("should apply filter modes consistently", () => {
    const mine = createCell({ uid: 10, dm: 30, p: 1 });
    const enemy = createCell({ uid: 11, dm: 0, p: 0 });
    const free = createCell({ uid: 0, dm: 0, p: 0 });

    const modes: MaproomCellFilterMode[] = [
      "all",
      "mine",
      "enemy",
      "free",
      "damaged",
      "protected",
    ];

    const matrix = modes.map((mode) => ({
      mode,
      mine: matchesCellFilter(mine, 10, mode),
      enemy: matchesCellFilter(enemy, 10, mode),
      free: matchesCellFilter(free, 10, mode),
    }));

    expect(matrix.find((m) => m.mode === "all")).toEqual({
      mode: "all",
      mine: true,
      enemy: true,
      free: true,
    });

    expect(matrix.find((m) => m.mode === "mine")?.mine).toBe(true);
    expect(matrix.find((m) => m.mode === "mine")?.enemy).toBe(false);

    expect(matrix.find((m) => m.mode === "enemy")?.enemy).toBe(true);
    expect(matrix.find((m) => m.mode === "enemy")?.free).toBe(false);

    expect(matrix.find((m) => m.mode === "free")?.free).toBe(true);
    expect(matrix.find((m) => m.mode === "free")?.mine).toBe(false);

    expect(matrix.find((m) => m.mode === "damaged")?.mine).toBe(true);
    expect(matrix.find((m) => m.mode === "damaged")?.enemy).toBe(false);

    expect(matrix.find((m) => m.mode === "protected")?.mine).toBe(true);
    expect(matrix.find((m) => m.mode === "protected")?.enemy).toBe(false);
  });

  it("should parse and validate jump coordinates", () => {
    expect(parseMaproomJumpInput("123", "456", 799)).toEqual({ x: 123, y: 456 });
    expect(parseMaproomJumpInput(0, 799, 799)).toEqual({ x: 0, y: 799 });

    expect(parseMaproomJumpInput("-1", "10", 799)).toBeNull();
    expect(parseMaproomJumpInput("800", "10", 799)).toBeNull();
    expect(parseMaproomJumpInput("x", "10", 799)).toBeNull();
  });
});
