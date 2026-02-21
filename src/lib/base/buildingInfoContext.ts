import type { LegacyBuildingCategory } from "./buildingType";

export const BUILDING_CONTEXT_ACTION_IDS = [
  "upgrade_selected",
  "cancel_upgrade_selected",
  "start_repair_selected",
  "start_repair_all",
  "collect_selected",
  "collect_all_resources",
  "open_maproom",
  "open_social",
  "open_store",
  "open_academy",
  "open_hatchery",
  "open_bunker",
  "open_yard_planner",
  "open_lockers",
  "open_juice",
  "open_housing",
  "open_baiter",
] as const;

export type BuildingContextActionId = (typeof BUILDING_CONTEXT_ACTION_IDS)[number];

export type BuildingContextAction = {
  id: BuildingContextActionId;
  label: string;
  implemented: boolean;
  disabled?: boolean;
  reason?: string;
};

export type BuildingContextInput = {
  selectedBuildingCode: number | null;
  selectedBuildingCategory: LegacyBuildingCategory | null;
  selectedBuildingHasPendingUpgrade: boolean;
  selectedBuildingIsDamaged: boolean;
  resourceBuildingCount: number;
  damagedBuildingCount: number;
};

export function isBuildingContextActionId(value: string): value is BuildingContextActionId {
  return (BUILDING_CONTEXT_ACTION_IDS as readonly string[]).includes(value);
}

export function getBuildingInfoContextActions(
  input: BuildingContextInput
): BuildingContextAction[] {
  const actions: BuildingContextAction[] = [];
  const add = (action: BuildingContextAction): void => {
    if (!actions.some((existing) => existing.id === action.id)) {
      actions.push(action);
    }
  };

  add(enabled("open_maproom", "Abrir mapa"));
  add(enabled("open_social", "Social"));

  if (input.resourceBuildingCount > 0) {
    add(enabled("collect_all_resources", "Coletar todos"));
  }

  if (input.damagedBuildingCount > 0) {
    add(enabled("start_repair_all", "Reparar todos"));
  }

  if (input.selectedBuildingCode === null) {
    return actions;
  }

  if (input.selectedBuildingHasPendingUpgrade) {
    add(enabled("cancel_upgrade_selected", "Cancelar upgrade"));
  } else {
    add(enabled("upgrade_selected", "Upgrade"));
  }

  if (input.selectedBuildingCategory === "resource") {
    add(enabled("collect_selected", "Coletar selecionado"));
  }

  if (
    input.selectedBuildingIsDamaged &&
    !input.selectedBuildingHasPendingUpgrade
  ) {
    add(enabled("start_repair_selected", "Reparar"));
  }

  switch (input.selectedBuildingCode) {
    case 10:
      add(enabled("open_yard_planner", "Yard planner"));
      break;
    case 12:
      add(enabled("open_store", "Abrir store"));
      break;
    case 26:
      add(enabled("open_academy", "Abrir academy"));
      break;
    case 13:
    case 16:
      add(enabled("open_hatchery", "Abrir hatchery"));
      break;
    case 22:
      add(enabled("open_bunker", "Abrir bunker"));
      break;
    case 8:
      add(enabled("open_lockers", "Abrir lockers"));
      break;
    case 9:
      add(enabled("open_juice", "Juice monsters"));
      break;
    case 6:
    case 112:
    case 113:
      add(enabled("open_housing", "Abrir housing"));
      break;
    case 19:
      add(enabled("open_baiter", "Abrir baiter"));
      break;
  }

  return actions;
}

function enabled(id: BuildingContextActionId, label: string): BuildingContextAction {
  return {
    id,
    label,
    implemented: true,
    disabled: false,
  };
}
