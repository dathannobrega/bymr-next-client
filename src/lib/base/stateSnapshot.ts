import type { StateSnapshotResponse } from "../contracts/state";
import type { ParsedBaseLoad } from "./baseLoad";

export function stateSnapshotToParsedBaseLoad(snapshot: StateSnapshotResponse): ParsedBaseLoad {
  return {
    yardWidth: snapshot.base.yardWidth,
    yardHeight: snapshot.base.yardHeight,
    yardTheme: snapshot.base.yardTheme,
    buildings: snapshot.buildings,
    resources: snapshot.resources.active,
    credits: snapshot.progression.credits,
    storeData: snapshot.storeData,
    academy: snapshot.academy,
  };
}
