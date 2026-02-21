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
  footprintW?: number;
  footprintH?: number;
  countdownUpgrade?: number;
  upgradeToLevel?: number;
  hp?: number;
  maxHp?: number;
  repairing?: boolean;
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

export type StoreInventoryEntry = {
  q: number;
  e?: number;
};

export type AcademyMonsterTraining = {
  startedAt: number;
  durationSec: number;
  completesAt: number;
  remainingSec: number;
  targetLevel: number;
};

export type AcademyMonsterState = {
  level: number;
  maxLevel: number;
  inLocker: boolean;
  canTrain: boolean;
  nextTrainingCostR3?: number;
  nextTrainingDurationSec?: number;
  training?: AcademyMonsterTraining;
};

export type AcademyState = {
  buildingId: string | null;
  buildingLevel: number;
  busy: boolean;
  activeMonsterId: string | null;
  monsters: Record<string, AcademyMonsterState>;
};

export type ParsedBaseLoad = {
  yardWidth: number;
  yardHeight: number;
  yardTheme?: "grass" | "sand" | "lava" | "rock" | "crater";
  buildings: YardBuilding[];
  resources?: BaseResourceSummary;
  credits?: number;
  storeData?: Record<string, StoreInventoryEntry>;
  academy?: AcademyState;
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
    yardTheme: parseYardTheme(obj.yardTheme ?? obj.terrainTheme ?? obj.yardType),
    buildings,
    resources: parseResourceSummary(obj.resources),
    credits: optionalNonNegativeNumberFromUnknown(obj.credits),
    storeData: parseStoreData(obj.storeData ?? obj.storedata),
    academy: parseAcademyState(obj.academy),
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
    footprintW: optionalPositiveNumberFromUnknown(value.footprintW ?? value.fw),
    footprintH: optionalPositiveNumberFromUnknown(value.footprintH ?? value.fh),
    countdownUpgrade: optionalNumberFromUnknown(
      value.countdownUpgrade ?? value.cU ?? value.countdownupgrade
    ),
    upgradeToLevel: optionalNumberFromUnknown(value.upgradeToLevel),
    hp: optionalNonNegativeNumberFromUnknown(value.hp),
    maxHp: optionalPositiveNumberFromUnknown(value.maxHp ?? value.maxHealth),
    repairing: optionalBooleanFromUnknown(value.repairing ?? value.rE),
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

function optionalPositiveNumberFromUnknown(value: unknown): number | undefined {
  const parsed = optionalNumberFromUnknown(value);
  if (parsed === undefined) return undefined;
  return parsed > 0 ? parsed : undefined;
}

function optionalNonNegativeNumberFromUnknown(value: unknown): number | undefined {
  const parsed = optionalNumberFromUnknown(value);
  if (parsed === undefined) return undefined;
  return parsed >= 0 ? parsed : undefined;
}

function optionalBooleanFromUnknown(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value) > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
    if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  }
  return undefined;
}

function parseStoreData(value: unknown): Record<string, StoreInventoryEntry> | undefined {
  if (!isRecord(value)) return undefined;

  const out: Record<string, StoreInventoryEntry> = {};
  for (const [key, rawEntry] of Object.entries(value)) {
    if (!isRecord(rawEntry)) continue;

    const q = numberFromUnknown(rawEntry.q, Number.NaN);
    if (!Number.isFinite(q) || q < 0) continue;

    const e = optionalNonNegativeNumberFromUnknown(rawEntry.e);
    out[key.toUpperCase()] = {
      q,
      ...(e !== undefined ? { e } : {}),
    };
  }

  return out;
}

function parseAcademyState(value: unknown): AcademyState | undefined {
  if (!isRecord(value)) return undefined;

  const buildingIdRaw = value.buildingId;
  const activeMonsterIdRaw = value.activeMonsterId;
  const monstersRaw = isRecord(value.monsters) ? value.monsters : value;
  const monsters: Record<string, AcademyMonsterState> = {};

  for (const [rawMonsterId, rawEntry] of Object.entries(monstersRaw)) {
    if (!isRecord(rawEntry)) continue;
    const monsterId = rawMonsterId.trim().toUpperCase();
    if (!monsterId) continue;

    const level = Math.max(1, numberFromUnknown(rawEntry.level, 1));
    const maxLevel = Math.max(level, numberFromUnknown(rawEntry.maxLevel, 6));
    const inLocker = Boolean(rawEntry.inLocker);
    const canTrain = Boolean(rawEntry.canTrain);
    const nextTrainingCostR3 = optionalNonNegativeNumberFromUnknown(rawEntry.nextTrainingCostR3);
    const nextTrainingDurationSec = optionalNonNegativeNumberFromUnknown(
      rawEntry.nextTrainingDurationSec
    );
    const training = parseAcademyTraining(rawEntry.training ?? rawEntry);

    monsters[monsterId] = {
      level,
      maxLevel,
      inLocker,
      canTrain,
      ...(nextTrainingCostR3 !== undefined ? { nextTrainingCostR3 } : {}),
      ...(nextTrainingDurationSec !== undefined ? { nextTrainingDurationSec } : {}),
      ...(training ? { training } : {}),
    };
  }

  return {
    buildingId:
      typeof buildingIdRaw === "string" && buildingIdRaw.trim().length > 0
        ? buildingIdRaw
        : null,
    buildingLevel: Math.max(0, numberFromUnknown(value.buildingLevel, 0)),
    busy: Boolean(value.busy),
    activeMonsterId:
      typeof activeMonsterIdRaw === "string" && activeMonsterIdRaw.trim().length > 0
        ? activeMonsterIdRaw.toUpperCase()
        : null,
    monsters,
  };
}

function parseAcademyTraining(value: unknown): AcademyMonsterTraining | undefined {
  if (!isRecord(value)) return undefined;

  const startedAt = optionalNonNegativeNumberFromUnknown(value.startedAt);
  const durationSec = optionalPositiveNumberFromUnknown(value.durationSec ?? value.duration);
  const completesAt = optionalPositiveNumberFromUnknown(value.completesAt ?? value.time);
  const remainingSec = optionalNonNegativeNumberFromUnknown(value.remainingSec);
  const targetLevel = optionalPositiveNumberFromUnknown(value.targetLevel);

  if (
    startedAt === undefined ||
    durationSec === undefined ||
    completesAt === undefined ||
    remainingSec === undefined ||
    targetLevel === undefined
  ) {
    return undefined;
  }

  return {
    startedAt,
    durationSec,
    completesAt,
    remainingSec,
    targetLevel,
  };
}

function parseYardTheme(value: unknown): ParsedBaseLoad["yardTheme"] {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "grass" ||
    normalized === "sand" ||
    normalized === "lava" ||
    normalized === "rock" ||
    normalized === "crater"
  ) {
    return normalized;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
