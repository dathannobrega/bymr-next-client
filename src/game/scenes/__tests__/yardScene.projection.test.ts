import { describe, expect, it } from "vitest";
import { worldToScreen } from "../iso";

describe("YardScene isometric projection", () => {
  it("maps tile origin deterministically", () => {
    expect(worldToScreen(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("keeps deterministic rounding for world->screen", () => {
    expect(worldToScreen(1, 0)).toEqual({ x: 48, y: 24 });
    expect(worldToScreen(0, 1)).toEqual({ x: -48, y: 24 });
    expect(worldToScreen(3, 2)).toEqual({ x: 48, y: 120 });
  });
});
