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
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: false,
      selectedBuildingFortificationLevel: 0,
      selectedBuildingIsDamaged: false,
      selectedBuildingCanFunction: false,
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
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 1,
      selectedBuildingIsDamaged: true,
      selectedBuildingCanFunction: true,
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
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 1,
      selectedBuildingIsDamaged: true,
      selectedBuildingCanFunction: true,
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
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 0,
      selectedBuildingIsDamaged: false,
      selectedBuildingCanFunction: true,
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
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 0,
      selectedBuildingIsDamaged: false,
      selectedBuildingCanFunction: true,
      resourceBuildingCount: 0,
      damagedBuildingCount: 0,
    });

    expect(actions.map((action) => action.id)).toContain("open_academy");
  });

  it("should validate action ids", () => {
    expect(isBuildingContextActionId("open_maproom")).toBe(true);
    expect(isBuildingContextActionId("collect_selected")).toBe(true);
    expect(isBuildingContextActionId("start_repair_selected")).toBe(true);
    expect(isBuildingContextActionId("start_fortify_selected")).toBe(true);
    expect(isBuildingContextActionId("invalid_action")).toBe(false);
  });

  it("should disable store action when building cannot function", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 12,
      selectedBuildingCategory: "utility",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 0,
      selectedBuildingIsDamaged: true,
      selectedBuildingCanFunction: false,
      resourceBuildingCount: 0,
      damagedBuildingCount: 1,
    });

    const storeAction = actions.find((action) => action.id === "open_store");
    expect(storeAction?.implemented).toBe(true);
    expect(storeAction?.disabled).toBe(true);
  });

  it("should expose cancel/finish actions when fortify is running", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 20,
      selectedBuildingCategory: "defense",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingHasPendingFortify: true,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 2,
      selectedBuildingIsDamaged: false,
      selectedBuildingCanFunction: true,
      resourceBuildingCount: 0,
      damagedBuildingCount: 0,
    });

    expect(actions.map((action) => action.id)).toContain("cancel_fortify_selected");
    expect(actions.map((action) => action.id)).toContain("finish_fortify_now_selected");
    expect(actions.map((action) => action.id)).not.toContain("start_fortify_selected");
  });

  it("should disable start fortify when building is at max fortification", () => {
    const actions = getBuildingInfoContextActions({
      selectedBuildingCode: 20,
      selectedBuildingCategory: "defense",
      selectedBuildingHasPendingUpgrade: false,
      selectedBuildingHasPendingFortify: false,
      selectedBuildingCanFortify: true,
      selectedBuildingFortificationLevel: 4,
      selectedBuildingIsDamaged: false,
      selectedBuildingCanFunction: true,
      resourceBuildingCount: 0,
      damagedBuildingCount: 0,
    });

    const startFortify = actions.find((action) => action.id === "start_fortify_selected");
    expect(startFortify?.implemented).toBe(true);
    expect(startFortify?.disabled).toBe(true);
  });
});
