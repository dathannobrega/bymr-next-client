import type { StateSnapshotResponse } from "../contracts/state";
import type { ParsedBaseLoad } from "./baseLoad";

export function stateSnapshotToParsedBaseLoad(snapshot: StateSnapshotResponse): ParsedBaseLoad {
  return {
    yardWidth: snapshot.base.yardWidth,
    yardHeight: snapshot.base.yardHeight,
    yardTheme: snapshot.base.yardTheme,
    buildings: snapshot.buildings,
    resources: snapshot.resources.active,
    progression: {
      level: snapshot.progression.level,
      tutorialStage: snapshot.progression.tutorialStage,
      points: snapshot.progression.points,
      baseValue: snapshot.progression.baseValue,
      empireValue: snapshot.progression.empireValue,
      protected: snapshot.progression.protected,
      damage: snapshot.progression.damage,
      destroyed: snapshot.progression.destroyed,
    },
    repair: snapshot.repair,
    credits: snapshot.progression.credits,
    storeData: snapshot.storeData,
    academy: snapshot.academy,
  };
}
