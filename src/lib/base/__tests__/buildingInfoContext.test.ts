import { describe, expect, it } from "vitest";
import {
  getBuildingInfoContextActions,
  isBuildingContextActionId,
} from "../buildingInfoContext";

describe("building info context actions", () => {
  it("should expose base actions when no building is selected", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: null,
      selectedBuildingCategory: null,
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingIsDamaged: false,
      resourceBuildingCount: 3,
      damagedBuildingCount: 2,
    });

    expect(actions.map((action) => action.id)).toContain("open_maproom");
    expect(actions.map((action) => action.id)).toContain("open_social");
    expect(actions.map((action) => action.id)).toContain("collect_all_resources");
    expect(actions.map((action) => action.id)).toContain("start_repair_all");
  });

  it("should expose resource actions for resource collector", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 1,
      selectedBuildingCategory: "resource",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingIsDamaged: true,
      resourceBuildingCount: 2,
      damagedBuildingCount: 1,
    });

    expect(actions.map((action) => action.id)).toContain("upgrade_selected");
    expect(actions.map((action) => action.id)).toContain("collect_selected");
    expect(actions.map((action) => action.id)).toContain("start_repair_selected");
    expect(actions.find((action) => action.id === "collect_selected")?.implemented).toBe(true);
  });

  it("should swap upgrade for cancel when building has pending upgrade", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 20,
      selectedBuildingCategory: "defense",
      selectedBuildingHasPendingUpgrade: true,
      selectedBuildingIsDamaged: true,
      resourceBuildingCount: 0,
      damagedBuildingCount: 1,
    });

    expect(actions.map((action) => action.id)).toContain("cancel_upgrade_selected");
    expect(actions.map((action) => action.id)).not.toContain("upgrade_selected");
    expect(actions.map((action) => action.id)).not.toContain("start_repair_selected");
  });

  it("should expose migrated legacy-specific actions for store flow", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 12,
      selectedBuildingCategory: "utility",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingIsDamaged: false,
      resourceBuildingCount: 0,
      damagedBuildingCount: 0,
    });

    const openStore = actions.find((action) => action.id === "open_store");
    expect(openStore?.implemented).toBe(true);
    expect(openStore?.disabled).toBe(false);
  });

  it("should expose academy action for building 26", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 26,
      selectedBuildingCategory: "utility",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingIsDamaged: false,
      resourceBuildingCount: 0,
      damagedBuildingCount: 0,
    });

    expect(actions.map((action) => action.id)).toContain("open_academy");
  });

  it("should validate action ids", () => {
    expect(isBuildingContextActionId("open_maproom")).toBe(true);
    expect(isBuildingContextActionId("collect_selected")).toBe(true);
    expect(isBuildingContextActionId("start_repair_selected")).toBe(true);
    expect(isBuildingContextActionId("invalid_action")).toBe(false);
  });
});
