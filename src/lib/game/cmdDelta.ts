import type { ParsedBaseLoad, YardBuilding } from "../base/baseLoad";

type CmdDeltaItem = Record<string, unknown>;

export function applyCmdDeltaToBase(base: ParsedBaseLoad, delta: CmdDeltaItem[]): ParsedBaseLoad {
  const nextBuildings = [...base.buildings];

  delta.forEach((item) => {
    const op = typeof item.op === "string" ? item.op : "";
    if (op === "addBuilding") {
      const created = parseBuilding(item);
      if (!created) return;
      const existingIndex = nextBuildings.findIndex((b) => b.id === created.id);
      if (existingIndex >= 0) {
        nextBuildings[existingIndex] = created;
      } else {
        nextBuildings.push(created);
      }
      return;
    }

    if (op === "moveBuilding") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const x = toNumber(item.x);
      const y = toNumber(item.y);
      if (!buildingId || x === null || y === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = { ...nextBuildings[index], x, y };
      return;
    }

    if (op === "upgradeBuilding") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const level = toNumber(item.level);
      if (!buildingId || level === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = { ...nextBuildings[index], level };
    }
  });

  return {
    ...base,
    buildings: nextBuildings,
  };
}

function parseBuilding(raw: CmdDeltaItem): YardBuilding | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const type = typeof raw.type === "string" ? raw.type : null;
  const x = toNumber(raw.x);
  const y = toNumber(raw.y);

  if (!id || !type || x === null || y === null) return null;

  const level = toNumber(raw.level);
  return {
    id,
    type,
    x,
    y,
    ...(level !== null ? { level } : {}),
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
