import {
  legacyMainYardBuildingRules,
  type LegacyMainYardRule,
} from "../../data/buildings/legacyMainYardRules.js";
import { normalizeBuildingTypeInput } from "../../utils/buildingType.js";

type BuildingRecord = Record<string, unknown>;

export type LegacyRuleDerivedStats = {
  maxHp: number;
  collectorCapacity: number;
  collectorProducePerCycle: number;
  collectorCycleSec: number;
  repairTimeSec: number;
};

export function resolveLegacyBuildingTypeCode(raw: BuildingRecord): number | null {
  const fromTypeCode = parseIntSafe(raw.t, Number.NaN);
  if (Number.isFinite(fromTypeCode) && fromTypeCode > 0) {
    return fromTypeCode;
  }

  if (typeof raw.type === "string") {
    const normalized = normalizeBuildingTypeInput(raw.type);
    if (normalized) return normalized.code;
  }

  return null;
}

export function getLegacyRuleDerivedStats(
  typeCode: number,
  level: number
): LegacyRuleDerivedStats {
  const rule = legacyMainYardBuildingRules[typeCode];
  const normalizedLevel = Math.max(1, Math.trunc(level));

  return {
    maxHp: pickRuleLeveledValue(rule, "hpByLevel", normalizedLevel, 0),
    collectorCapacity: pickRuleLeveledValue(rule, "capacityByLevel", normalizedLevel, 0),
    collectorProducePerCycle: pickRuleLeveledValue(rule, "produceByLevel", normalizedLevel, 0),
    collectorCycleSec: Math.max(
      1,
      pickRuleLeveledValue(rule, "cycleTimeByLevel", normalizedLevel, 10)
    ),
    repairTimeSec: Math.max(
      0,
      pickRuleLeveledValue(rule, "repairTimeByLevel", normalizedLevel, 0)
    ),
  };
}

export function applyLegacyRuleDerivedStats(
  raw: BuildingRecord,
  typeCode: number,
  level: number,
  opts?: {
    forceFullHp?: boolean;
    clampHarvesterStored?: boolean;
  }
): boolean {
  const derived = getLegacyRuleDerivedStats(typeCode, level);
  let changed = false;

  if (derived.maxHp > 0) {
    const maxHp = derived.maxHp;
    if (parseIntSafe(raw.maxHp, Number.NaN) !== maxHp) {
      raw.maxHp = maxHp;
      changed = true;
    }
    if (parseIntSafe(raw.maxHealth, Number.NaN) !== maxHp) {
      raw.maxHealth = maxHp;
      changed = true;
    }

    const currentHp = parseIntSafe(raw.hp, Number.NaN);
    const shouldForceFullHp = Boolean(opts?.forceFullHp);
    if (shouldForceFullHp) {
      if (currentHp !== maxHp) {
        raw.hp = maxHp;
        changed = true;
      }
    } else if (!Number.isFinite(currentHp) || currentHp < 0) {
      raw.hp = maxHp;
      changed = true;
    } else if (currentHp > maxHp) {
      raw.hp = maxHp;
      changed = true;
    }
  }

  if (isMainHarvester(typeCode)) {
    if (derived.collectorCapacity > 0) {
      if (parseIntSafe(raw.stmax, Number.NaN) !== derived.collectorCapacity) {
        raw.stmax = derived.collectorCapacity;
        changed = true;
      }
      if (parseIntSafe(raw.storedMax, Number.NaN) !== derived.collectorCapacity) {
        raw.storedMax = derived.collectorCapacity;
        changed = true;
      }
      if (parseIntSafe(raw.storageMax, Number.NaN) !== derived.collectorCapacity) {
        raw.storageMax = derived.collectorCapacity;
        changed = true;
      }

      if (opts?.clampHarvesterStored) {
        const currentStored = Math.max(0, parseIntSafe(raw.st ?? raw.stored, 0));
        const clampedStored = Math.min(currentStored, derived.collectorCapacity);
        if (clampedStored !== currentStored) {
          raw.st = clampedStored;
          raw.stored = clampedStored;
          changed = true;
        }
      }
    }

    if (derived.collectorProducePerCycle > 0) {
      if (parseIntSafe(raw.pCycle, Number.NaN) !== derived.collectorCycleSec) {
        raw.pCycle = derived.collectorCycleSec;
        changed = true;
      }
      if (parseIntSafe(raw.produceCycleSec, Number.NaN) !== derived.collectorCycleSec) {
        raw.produceCycleSec = derived.collectorCycleSec;
        changed = true;
      }
      if (parseIntSafe(raw.pAmount, Number.NaN) !== derived.collectorProducePerCycle) {
        raw.pAmount = derived.collectorProducePerCycle;
        changed = true;
      }
      if (parseIntSafe(raw.produceAmount, Number.NaN) !== derived.collectorProducePerCycle) {
        raw.produceAmount = derived.collectorProducePerCycle;
        changed = true;
      }
    }
  }

  return changed;
}

function pickRuleLeveledValue(
  rule: LegacyMainYardRule | undefined,
  key:
    | "hpByLevel"
    | "capacityByLevel"
    | "produceByLevel"
    | "cycleTimeByLevel"
    | "repairTimeByLevel",
  level: number,
  fallback: number
): number {
  const values = rule?.[key];
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const index = Math.min(Math.max(level - 1, 0), values.length - 1);
  return Math.max(0, parseIntSafe(values[index], fallback));
}

function isMainHarvester(typeCode: number): boolean {
  return typeCode === 1 || typeCode === 2 || typeCode === 3 || typeCode === 4;
}

function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
