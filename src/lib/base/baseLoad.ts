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
};

export type ParsedBaseLoad = {
  yardWidth: number;
  yardHeight: number;
  buildings: YardBuilding[];
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

  const buildingsRaw = Array.isArray(obj.buildings)
    ? obj.buildings
    : Array.isArray(obj.Buildings)
      ? obj.Buildings
      : [];

  const buildings = buildingsRaw
    .map(parseBuilding)
    .filter((item): item is YardBuilding => item !== null);

  return {
    yardWidth,
    yardHeight,
    buildings,
  };
}

function parseBuilding(value: unknown): YardBuilding | null {
  if (!isRecord(value)) return null;

  const x = numberFromUnknown(value.x ?? value.X, NaN);
  const y = numberFromUnknown(value.y ?? value.Y, NaN);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  return {
    id: String(value.id ?? value.ID ?? `b-${x}-${y}`),
    type: String(value.type ?? value.Type ?? "unknown"),
    x,
    y,
    level: optionalNumberFromUnknown(value.level ?? value.Level),
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
