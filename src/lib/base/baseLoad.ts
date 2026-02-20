import { coerceBuildingTypeFromRecord } from "./buildingType";

export type BaseLoadMode = "view" | "build";

export type BaseLoadPayload = {
  baseId: string;
  mode: BaseLoadMode;
};

export type YardBuilding = {
  id: string;
  type: string;
  x: number;
  y: number;
  level?: number;
  countdownUpgrade?: number;
  upgradeToLevel?: number;
};

export type BaseResourceSummary = {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r1max: number;
  r2max: number;
  r3max: number;
  r4max: number;
};

export type ParsedBaseLoad = {
  yardWidth: number;
  yardHeight: number;
  buildings: YardBuilding[];
  resources?: BaseResourceSummary;
};

export function buildBaseLoadPayload(input: BaseLoadPayload): Record<string, unknown> {
  return {
    baseId: input.baseId,
    mode: input.mode,
  };
}

export function parseBaseLoadResponse(raw: unknown): ParsedBaseLoad {
  const obj = isRecord(raw) ? raw : {};

  const yardWidth = numberFromUnknown(obj.yardWidth, 20);
  const yardHeight = numberFromUnknown(obj.yardHeight, 14);

  const legacyBuildingData = isRecord(obj.buildingdata)
    ? Object.values(obj.buildingdata)
    : [];

  const buildingsRaw = Array.isArray(obj.buildings)
    ? obj.buildings
    : Array.isArray(obj.Buildings)
      ? obj.Buildings
      : legacyBuildingData;

  const buildings = buildingsRaw
    .map((building) => parseBuilding(building, yardWidth, yardHeight))
    .filter((item): item is YardBuilding => item !== null);

  return {
    yardWidth,
    yardHeight,
    buildings,
    resources: parseResourceSummary(obj.resources),
  };
}

function parseBuilding(value: unknown, yardWidth: number, yardHeight: number): YardBuilding | null {
  if (!isRecord(value)) return null;

  const x = numberFromUnknown(value.x ?? value.X, NaN);
  const y = numberFromUnknown(value.y ?? value.Y, NaN);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  if (x < 0 || y < 0 || x >= yardWidth || y >= yardHeight) return null;

  const type = coerceBuildingTypeFromRecord(
    value.type ?? value.Type,
    value.t ?? value.T
  );

  return {
    id: String(value.id ?? value.ID ?? `b-${x}-${y}`),
    type,
    x,
    y,
    level: optionalNumberFromUnknown(value.level ?? value.Level ?? value.l ?? value.L),
    countdownUpgrade: optionalNumberFromUnknown(
      value.countdownUpgrade ?? value.cU ?? value.countdownupgrade
    ),
    upgradeToLevel: optionalNumberFromUnknown(value.upgradeToLevel),
  };
}

function parseResourceSummary(value: unknown): BaseResourceSummary | undefined {
  if (!isRecord(value)) return undefined;
  return {
    r1: numberFromUnknown(value.r1, 0),
    r2: numberFromUnknown(value.r2, 0),
    r3: numberFromUnknown(value.r3, 0),
    r4: numberFromUnknown(value.r4, 0),
    r1max: numberFromUnknown(value.r1max, 0),
    r2max: numberFromUnknown(value.r2max, 0),
    r3max: numberFromUnknown(value.r3max, 0),
    r4max: numberFromUnknown(value.r4max, 0),
  };
}

function numberFromUnknown(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumberFromUnknown(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = numberFromUnknown(value, NaN);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
