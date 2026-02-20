import { BaseType } from "../../enums/Base.js";
import { Save } from "../../models/save.model.js";
import { coerceBuildingTypeFromRecord } from "../../utils/buildingType.js";
import { getLegacyFootprintTilesByCode } from "../../utils/buildingFootprint.js";

export const YARD_WIDTH = 20;
export const YARD_HEIGHT = 14;

export type YardTheme = "grass" | "sand" | "lava" | "rock" | "crater";

export type ResourceSummary = {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r1max: number;
  r2max: number;
  r3max: number;
  r4max: number;
};

export type NormalizedBuilding = {
  id: string;
  type: string;
  x: number;
  y: number;
  level?: number;
  footprintW?: number;
  footprintH?: number;
  countdownUpgrade?: number;
  upgradeToLevel?: number;
};

export function toNormalizedBuildings(
  save: Save,
  opts?: { yardWidth?: number; yardHeight?: number }
): NormalizedBuilding[] {
  const yardWidth = opts?.yardWidth ?? YARD_WIDTH;
  const yardHeight = opts?.yardHeight ?? YARD_HEIGHT;
  const buildingData = asRecord(save.buildingdata) ?? {};
  const out: NormalizedBuilding[] = [];

  for (const [key, value] of Object.entries(buildingData)) {
    const raw = asRecord(value);
    if (!raw) continue;

    const x = parseIntSafe(raw.x ?? raw.X, Number.NaN);
    const y = parseIntSafe(raw.y ?? raw.Y, Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || y < 0 || x >= yardWidth || y >= yardHeight) continue;

    const id = String(raw.id ?? key);
    const type = coerceBuildingTypeFromRecord(raw.type, raw.t);
    const typeCode = parseIntSafe(raw.t, Number.NaN);
    const defaultFootprint = getLegacyFootprintTilesByCode(
      Number.isFinite(typeCode) ? typeCode : undefined
    );
    const footprintWRaw = parseIntSafe(raw.footprintW ?? raw.fw, Number.NaN);
    const footprintHRaw = parseIntSafe(raw.footprintH ?? raw.fh, Number.NaN);
    const footprintW =
      Number.isFinite(footprintWRaw) && footprintWRaw > 0
        ? footprintWRaw
        : defaultFootprint.width;
    const footprintH =
      Number.isFinite(footprintHRaw) && footprintHRaw > 0
        ? footprintHRaw
        : defaultFootprint.height;

    const levelRaw = parseIntSafe(raw.level ?? raw.l, Number.NaN);
    const level = Number.isFinite(levelRaw) && levelRaw > 0 ? levelRaw : undefined;

    const countdownUpgradeRaw = parseIntSafe(raw.countdownUpgrade ?? raw.cU, Number.NaN);
    const countdownUpgrade =
      Number.isFinite(countdownUpgradeRaw) && countdownUpgradeRaw > 0
        ? countdownUpgradeRaw
        : undefined;

    const upgradeToLevelRaw = parseIntSafe(raw.upgradeToLevel, Number.NaN);
    const upgradeToLevel =
      Number.isFinite(upgradeToLevelRaw) && upgradeToLevelRaw > 0
        ? upgradeToLevelRaw
        : undefined;

    out.push({
      id,
      type,
      x,
      y,
      ...(level !== undefined ? { level } : {}),
      ...(footprintW > 1 ? { footprintW } : {}),
      ...(footprintH > 1 ? { footprintH } : {}),
      ...(countdownUpgrade !== undefined ? { countdownUpgrade } : {}),
      ...(upgradeToLevel !== undefined ? { upgradeToLevel } : {}),
    });
  }

  return out;
}

export function toResourceSummary(
  resources: unknown,
  defaultCapacity: number = 10000
): ResourceSummary {
  const value = asRecord(resources) ?? {};

  return {
    r1: normalizeNonNegative(parseIntSafe(value.r1, 0), 0),
    r2: normalizeNonNegative(parseIntSafe(value.r2, 0), 0),
    r3: normalizeNonNegative(parseIntSafe(value.r3, 0), 0),
    r4: normalizeNonNegative(parseIntSafe(value.r4, 0), 0),
    r1max: normalizeNonNegative(parseIntSafe(value.r1max, defaultCapacity), defaultCapacity),
    r2max: normalizeNonNegative(parseIntSafe(value.r2max, defaultCapacity), defaultCapacity),
    r3max: normalizeNonNegative(parseIntSafe(value.r3max, defaultCapacity), defaultCapacity),
    r4max: normalizeNonNegative(parseIntSafe(value.r4max, defaultCapacity), defaultCapacity),
  };
}

export function deriveYardTheme(save: Save): YardTheme {
  switch (save.type) {
    case BaseType.INFERNO:
    case BaseType.INFERNO_TRIBE:
      return "lava";
    case BaseType.OUTPOST:
      return "sand";
    case BaseType.TRIBE:
      return "rock";
    case BaseType.RANDOM:
      return "crater";
    default:
      return "grass";
  }
}

export function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeNonNegative(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}
