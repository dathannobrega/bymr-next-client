import { monsterStats } from "../../data/monsterStats.js";
import { Save } from "../../models/save.model.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import { normalizeBuildingTypeInput } from "../../utils/buildingType.js";

const ACADEMY_BUILDING_CODE = 26;
const MAX_MONSTER_LEVEL = 6;
const LOCKER_UNLOCKED_STATE = 2;

type BuildingDataRecord = Record<string, unknown>;
type AcademyDataRecord = Record<string, Record<string, unknown>>;

type AcademyBuildingRecord = {
  id: string;
  level: number;
  raw: BuildingDataRecord;
};

export type AcademyMonsterTrainingSummary = {
  startedAt: number;
  durationSec: number;
  completesAt: number;
  remainingSec: number;
  targetLevel: number;
};

export type AcademyMonsterSummary = {
  level: number;
  maxLevel: number;
  inLocker: boolean;
  canTrain: boolean;
  nextTrainingCostR3?: number;
  nextTrainingDurationSec?: number;
  training?: AcademyMonsterTrainingSummary;
};

export type AcademyStateSummary = {
  buildingId: string | null;
  buildingLevel: number;
  busy: boolean;
  activeMonsterId: string | null;
  monsters: Record<string, AcademyMonsterSummary>;
};

export function normalizeAcademyMonsterId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!/^(?:C|IC)\d{1,3}$/.test(normalized)) return null;
  return normalized;
}

export function buildAcademyStateSummary(
  save: Save,
  nowSec: number = getCurrentDateTime()
): AcademyStateSummary {
  const academyBuilding = findPrimaryAcademyBuilding(save);
  const academyData = asRecord(save.academy) as AcademyDataRecord | null;
  const lockerData = asRecord(save.lockerdata);
  const activeTraining = getActiveTraining(academyData, nowSec);
  const resources = asRecord(save.resources);
  const availableR3 = Math.max(0, parseIntSafe(resources?.r3, 0));

  const activeMonsterId =
    activeTraining.monsterId ??
    normalizeAcademyMonsterId(academyBuilding?.raw._upgrading ?? academyBuilding?.raw.upgrading);
  const buildingBusy = academyBuilding ? isBuildingBusy(academyBuilding.raw) : false;
  const busy = buildingBusy || activeMonsterId !== null;

  const buildingLevel = academyBuilding?.level ?? 0;
  const knownMonsterIds = collectKnownMonsterIds(academyData, lockerData);
  const monsters: Record<string, AcademyMonsterSummary> = {};

  for (const monsterId of knownMonsterIds) {
    const stats = monsterStats[monsterId];
    const maxLevel = getMonsterMaxLevel(monsterId);
    const academyEntry = academyData ? asRecord(academyData[monsterId]) : null;
    const level = clampLevel(parseIntSafe(academyEntry?.level, 1), maxLevel);
    const inLocker = isMonsterUnlockedInLocker(lockerData, monsterId);
    const nextTrainingCostR3 = Math.max(
      0,
      parseIntSafe(stats?.trainingCosts?.[Math.max(0, level - 1)]?.[0], 0)
    );
    const nextTrainingDurationSec = Math.max(
      0,
      parseIntSafe(stats?.trainingCosts?.[Math.max(0, level - 1)]?.[1], 0)
    );
    const hasEnoughResources = nextTrainingCostR3 <= 0 || availableR3 >= nextTrainingCostR3;
    const training =
      academyEntry && hasRunningTraining(academyEntry, nowSec)
        ? toTrainingSummary(academyEntry, level, maxLevel, stats, nowSec)
        : undefined;
    const canTrain =
      inLocker &&
      level < maxLevel &&
      buildingLevel > 0 &&
      level <= buildingLevel &&
      !busy &&
      !training &&
      hasEnoughResources;

    monsters[monsterId] = {
      level,
      maxLevel,
      inLocker,
      canTrain,
      ...(level < maxLevel && nextTrainingCostR3 > 0 ? { nextTrainingCostR3 } : {}),
      ...(level < maxLevel && nextTrainingDurationSec > 0
        ? { nextTrainingDurationSec }
        : {}),
      ...(training ? { training } : {}),
    };
  }

  return {
    buildingId: academyBuilding?.id ?? null,
    buildingLevel,
    busy,
    activeMonsterId,
    monsters,
  };
}

export function applyLegacyAcademyProgress(
  save: Save,
  nowSec: number = getCurrentDateTime()
): { changed: boolean; completedMonsterIds: string[] } {
  const academyDataRaw = asRecord(save.academy);
  if (!academyDataRaw) {
    return {
      changed: false,
      completedMonsterIds: [],
    };
  }

  const academyData = academyDataRaw as AcademyDataRecord;
  let changed = false;
  const completedMonsterIds: string[] = [];

  for (const [rawMonsterId] of Object.entries(academyData)) {
    const monsterId = normalizeAcademyMonsterId(rawMonsterId);
    if (!monsterId) {
      delete academyData[rawMonsterId];
      changed = true;
      continue;
    }

    if (rawMonsterId !== monsterId) {
      academyData[monsterId] = academyData[rawMonsterId] ?? { level: 1 };
      delete academyData[rawMonsterId];
      changed = true;
    }

    const entry = asRecord(academyData[monsterId]);
    if (!entry) {
      academyData[monsterId] = { level: 1 };
      changed = true;
      continue;
    }

    const maxLevel = getMonsterMaxLevel(monsterId);
    const normalizedLevel = clampLevel(parseIntSafe(entry.level, 1), maxLevel);
    if (parseIntSafe(entry.level, normalizedLevel) !== normalizedLevel) {
      entry.level = normalizedLevel;
      changed = true;
    }

    const completesAt = parseIntSafe(entry.time, 0);
    if (completesAt <= 0) {
      continue;
    }

    if (completesAt > nowSec) {
      continue;
    }

    const nextLevel = clampLevel(normalizedLevel + 1, maxLevel);
    if (nextLevel !== normalizedLevel) {
      entry.level = nextLevel;
    }

    delete entry.time;
    delete entry.duration;
    delete entry.startedAt;
    delete entry.targetLevel;
    completedMonsterIds.push(monsterId);
    changed = true;
  }

  const activeMonsterIds = getActiveTrainingMonsterIds(academyData, nowSec);
  const completedSet = new Set(completedMonsterIds);
  for (const building of getAcademyBuildings(save)) {
    const upgradingMonsterId = normalizeAcademyMonsterId(
      building.raw._upgrading ?? building.raw.upgrading
    );
    if (!upgradingMonsterId) continue;

    if (completedSet.has(upgradingMonsterId) || !activeMonsterIds.has(upgradingMonsterId)) {
      delete building.raw._upgrading;
      delete building.raw.upgrading;
      changed = true;
    }
  }

  return {
    changed,
    completedMonsterIds,
  };
}

export function ensureAcademyData(save: Save): AcademyDataRecord {
  const existing = asRecord(save.academy);
  if (existing) {
    return existing as AcademyDataRecord;
  }

  const created: AcademyDataRecord = {};
  save.academy = created;
  return created;
}

function collectKnownMonsterIds(
  academyData: AcademyDataRecord | null,
  lockerData: Record<string, unknown> | null
): string[] {
  const ids = new Set<string>(Object.keys(monsterStats));

  if (academyData) {
    for (const rawMonsterId of Object.keys(academyData)) {
      const normalized = normalizeAcademyMonsterId(rawMonsterId);
      if (normalized) ids.add(normalized);
    }
  }

  if (lockerData) {
    for (const rawMonsterId of Object.keys(lockerData)) {
      const normalized = normalizeAcademyMonsterId(rawMonsterId);
      if (!normalized) continue;
      ids.add(normalized);
    }
  }

  return [...ids].sort(compareMonsterIds);
}

function compareMonsterIds(a: string, b: string): number {
  const aIsInferno = a.startsWith("IC");
  const bIsInferno = b.startsWith("IC");
  if (aIsInferno !== bIsInferno) {
    return aIsInferno ? 1 : -1;
  }

  const aNum = parseIntSafe(a.replace("IC", "").replace("C", ""), 0);
  const bNum = parseIntSafe(b.replace("IC", "").replace("C", ""), 0);
  return aNum - bNum;
}

function toTrainingSummary(
  academyEntry: Record<string, unknown>,
  currentLevel: number,
  maxLevel: number,
  stats: (typeof monsterStats)[string] | undefined,
  nowSec: number
): AcademyMonsterTrainingSummary {
  const completesAt = Math.max(nowSec, parseIntSafe(academyEntry.time, nowSec));
  const defaultDuration = Math.max(
    1,
    parseIntSafe(stats?.trainingCosts?.[Math.max(0, currentLevel - 1)]?.[1], 1)
  );
  const durationSec = Math.max(1, parseIntSafe(academyEntry.duration, defaultDuration));
  const startedAt = Math.max(0, parseIntSafe(academyEntry.startedAt, completesAt - durationSec));
  const targetLevel = clampLevel(
    parseIntSafe(academyEntry.targetLevel, currentLevel + 1),
    maxLevel
  );

  return {
    startedAt,
    durationSec,
    completesAt,
    remainingSec: Math.max(0, completesAt - nowSec),
    targetLevel,
  };
}

function getActiveTraining(
  academyData: AcademyDataRecord | null,
  nowSec: number
): { monsterId: string | null; completesAt: number | null } {
  if (!academyData) {
    return { monsterId: null, completesAt: null };
  }

  let activeMonsterId: string | null = null;
  let activeCompletesAt: number | null = null;

  for (const [rawMonsterId, rawEntry] of Object.entries(academyData)) {
    const monsterId = normalizeAcademyMonsterId(rawMonsterId);
    if (!monsterId) continue;

    const entry = asRecord(rawEntry);
    if (!entry || !hasRunningTraining(entry, nowSec)) continue;

    const completesAt = parseIntSafe(entry.time, nowSec);
    if (activeCompletesAt === null || completesAt < activeCompletesAt) {
      activeMonsterId = monsterId;
      activeCompletesAt = completesAt;
    }
  }

  return {
    monsterId: activeMonsterId,
    completesAt: activeCompletesAt,
  };
}

function getActiveTrainingMonsterIds(
  academyData: AcademyDataRecord,
  nowSec: number
): Set<string> {
  const active = new Set<string>();
  for (const [rawMonsterId, rawEntry] of Object.entries(academyData)) {
    const monsterId = normalizeAcademyMonsterId(rawMonsterId);
    if (!monsterId) continue;

    const entry = asRecord(rawEntry);
    if (!entry || !hasRunningTraining(entry, nowSec)) continue;
    active.add(monsterId);
  }
  return active;
}

function hasRunningTraining(entry: Record<string, unknown>, nowSec: number): boolean {
  const completesAt = parseIntSafe(entry.time, 0);
  return completesAt > nowSec;
}

function findPrimaryAcademyBuilding(save: Save): AcademyBuildingRecord | null {
  const buildings = getAcademyBuildings(save);
  if (buildings.length === 0) return null;
  buildings.sort((a, b) => b.level - a.level);
  return buildings[0];
}

function getAcademyBuildings(save: Save): AcademyBuildingRecord[] {
  const buildingData = asRecord(save.buildingdata);
  if (!buildingData) return [];

  const out: AcademyBuildingRecord[] = [];
  for (const [key, rawValue] of Object.entries(buildingData)) {
    const raw = asRecord(rawValue);
    if (!raw) continue;

    if (resolveBuildingTypeCode(raw) !== ACADEMY_BUILDING_CODE) continue;
    out.push({
      id: String(raw.id ?? key),
      level: Math.max(1, parseIntSafe(raw.level ?? raw.l, 1)),
      raw,
    });
  }

  return out;
}

function resolveBuildingTypeCode(raw: BuildingDataRecord): number | null {
  const fromT = parseIntSafe(raw.t, Number.NaN);
  if (Number.isFinite(fromT)) {
    return fromT;
  }

  if (typeof raw.type === "string") {
    const normalized = normalizeBuildingTypeInput(raw.type);
    if (normalized) return normalized.code;
  }

  return null;
}

function isBuildingBusy(raw: BuildingDataRecord): boolean {
  return (
    parseIntSafe(raw.cB ?? raw.countdownBuild, 0) > 0 ||
    parseIntSafe(raw.cU ?? raw.countdownUpgrade, 0) > 0 ||
    parseIntSafe(raw.cF ?? raw.countdownFortify, 0) > 0
  );
}

function isMonsterUnlockedInLocker(
  lockerData: Record<string, unknown> | null,
  monsterId: string
): boolean {
  if (!lockerData) return false;
  const rawEntry = lockerData[monsterId];
  if (rawEntry === undefined || rawEntry === null) return false;

  if (typeof rawEntry === "number" || typeof rawEntry === "string") {
    return parseIntSafe(rawEntry, 0) === LOCKER_UNLOCKED_STATE;
  }

  const entry = asRecord(rawEntry);
  if (!entry) return false;
  return parseIntSafe(entry.t ?? entry.state ?? entry.status, 0) === LOCKER_UNLOCKED_STATE;
}

function getMonsterMaxLevel(monsterId: string): number {
  const costs = monsterStats[monsterId]?.trainingCosts;
  if (!Array.isArray(costs) || costs.length === 0) {
    return MAX_MONSTER_LEVEL;
  }
  return clampLevel(costs.length + 1, MAX_MONSTER_LEVEL);
}

function clampLevel(level: number, maxLevel: number = MAX_MONSTER_LEVEL): number {
  return Math.max(1, Math.min(maxLevel, Math.trunc(level)));
}

function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}
