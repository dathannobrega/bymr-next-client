import type { ParsedBaseLoad, YardBuilding } from "../base/baseLoad";

type CmdDeltaItem = Record<string, unknown>;

export function applyCmdDeltaToBase(base: ParsedBaseLoad, delta: CmdDeltaItem[]): ParsedBaseLoad {
  const nextBuildings = [...base.buildings];
  let nextResources = base.resources;

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
      const footprintW = toNumber(item.footprintW);
      const footprintH = toNumber(item.footprintH);
      if (!buildingId || x === null || y === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        x,
        y,
        ...(footprintW !== null ? { footprintW } : {}),
        ...(footprintH !== null ? { footprintH } : {}),
      };
      return;
    }

    if (op === "upgradeBuilding") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const level = toNumber(item.level);
      if (!buildingId || level === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        level,
        countdownUpgrade: undefined,
        upgradeToLevel: undefined,
      };
      return;
    }

    if (op === "startUpgrade") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const remainingSec = toNumber(item.remainingSec);
      const toLevel = toNumber(item.toLevel);
      if (!buildingId) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        ...(remainingSec !== null ? { countdownUpgrade: remainingSec } : {}),
        ...(toLevel !== null ? { upgradeToLevel: toLevel } : {}),
      };
      return;
    }

    if (op === "cancelUpgrade") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      if (!buildingId) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        countdownUpgrade: undefined,
        upgradeToLevel: undefined,
      };
      return;
    }

    if (op === "setResources") {
      const resources = asRecord(item.resources);
      if (!resources) return;
      nextResources = {
        r1: toNumber(resources.r1) ?? 0,
        r2: toNumber(resources.r2) ?? 0,
        r3: toNumber(resources.r3) ?? 0,
        r4: toNumber(resources.r4) ?? 0,
        r1max: toNumber(resources.r1max) ?? 0,
        r2max: toNumber(resources.r2max) ?? 0,
        r3max: toNumber(resources.r3max) ?? 0,
        r4max: toNumber(resources.r4max) ?? 0,
      };
    }
  });

  return {
    ...base,
    buildings: nextBuildings,
    resources: nextResources,
  };
}

function parseBuilding(raw: CmdDeltaItem): YardBuilding | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const type = typeof raw.type === "string" ? raw.type : null;
  const x = toNumber(raw.x);
  const y = toNumber(raw.y);

  if (!id || !type || x === null || y === null) return null;

  const level = toNumber(raw.level);
  const footprintW = toNumber(raw.footprintW);
  const footprintH = toNumber(raw.footprintH);
  const countdownUpgrade = toNumber(raw.countdownUpgrade ?? raw.cU);
  const upgradeToLevel = toNumber(raw.upgradeToLevel);
  return {
    id,
    type,
    x,
    y,
    ...(level !== null ? { level } : {}),
    ...(footprintW !== null ? { footprintW } : {}),
    ...(footprintH !== null ? { footprintH } : {}),
    ...(countdownUpgrade !== null ? { countdownUpgrade } : {}),
    ...(upgradeToLevel !== null ? { upgradeToLevel } : {}),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
