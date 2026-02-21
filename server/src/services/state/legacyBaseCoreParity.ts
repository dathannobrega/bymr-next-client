import { legacyMainYardBuildingRules } from "../../data/buildings/legacyMainYardRules.js";
import { BaseType } from "../../enums/Base.js";
import { Save } from "../../models/save.model.js";
import { calculateBaseLevel } from "../base/calculateBaseLevel.js";
import {
  getLegacyRuleDerivedStats,
  resolveLegacyBuildingTypeCode,
} from "./legacyBuildingRuleEffects.js";

const BASE_VALUE_EXCLUDED_CATEGORIES = new Set(["enemy", "trap", "taunt", "mushroom"]);

export type LegacyProgressionSummary = {
  level: number;
  points: number;
  baseValue: number;
  empireValue: number;
};

export type LegacyRepairSummary = {
  estimatedDurationSec: number;
  repairingCount: number;
  damagedCount: number;
};

export function applyLegacyBaseProgression(save: Save): {
  changed: boolean;
  progression: LegacyProgressionSummary;
} {
  const current = buildLegacyProgressionSummary(save);
  if (!isMainYardLikeBaseType(save.type)) {
    return {
      changed: false,
      progression: current,
    };
  }

  const computedBaseValue = calculateLegacyMainYardBaseValue(save);
  // Legacy BASE.CalcBaseValue updates _baseValue monotonically for main/inferno main yards.
  const nextBaseValue = Math.max(current.baseValue, computedBaseValue);
  const nextLevel = Math.max(1, calculateBaseLevel(String(current.points), String(nextBaseValue)));

  const next: LegacyProgressionSummary = {
    level: nextLevel,
    points: current.points,
    baseValue: nextBaseValue,
    empireValue: current.empireValue,
  };

  let changed = false;
  if (save.level !== nextLevel) {
    save.level = nextLevel;
    changed = true;
  }

  if (String(save.basevalue) !== String(nextBaseValue)) {
    save.basevalue = String(nextBaseValue);
    changed = true;
  }

  return {
    changed,
    progression: next,
  };
}

export function buildLegacyProgressionSummary(save: Save): LegacyProgressionSummary {
  return {
    level: Math.max(1, parseIntSafe(save.level, 1)),
    points: Math.max(0, parseIntSafe(save.points, 0)),
    baseValue: Math.max(0, parseIntSafe(save.basevalue, 0)),
    empireValue: Math.max(0, parseIntSafe(save.empirevalue, 0)),
  };
}

export function buildLegacyRepairSummary(save: Save): LegacyRepairSummary {
  const buildingData = asRecord(save.buildingdata);
  if (!buildingData) {
    return {
      estimatedDurationSec: 0,
      repairingCount: 0,
      damagedCount: 0,
    };
  }

  let estimatedDurationSec = 0;
  let repairingCount = 0;
  let damagedCount = 0;

  for (const rawEntry of Object.values(buildingData)) {
    const raw = asRecord(rawEntry);
    if (!raw) continue;

    const typeCode = resolveLegacyBuildingTypeCode(raw);
    if (typeCode === null) continue;

    const level = Math.max(1, parseIntSafe(raw.l ?? raw.level, 1));
    const derived = getLegacyRuleDerivedStats(typeCode, level);
    if (derived.maxHp <= 0 || derived.repairTimeSec <= 0) continue;

    const maxHp = derived.maxHp;
    const hp = clamp(
      parseIntSafe(raw.hp, maxHp),
      0,
      maxHp
    );
    if (hp >= maxHp) continue;

    damagedCount += 1;
    if (parseIntSafe(raw.rE ?? raw.repairing, 0) <= 0) continue;

    repairingCount += 1;
    const missingHp = maxHp - hp;
    const healPerSec = maxHp / derived.repairTimeSec;
    if (!Number.isFinite(healPerSec) || healPerSec <= 0) continue;

    const remainingSec = Math.max(0, Math.ceil(missingHp / healPerSec));
    estimatedDurationSec = Math.max(estimatedDurationSec, remainingSec);
  }

  return {
    estimatedDurationSec,
    repairingCount,
    damagedCount,
  };
}

export function isLegacyProgressionEqual(
  left: LegacyProgressionSummary,
  right: LegacyProgressionSummary
): boolean {
  return (
    left.level === right.level &&
    left.points === right.points &&
    left.baseValue === right.baseValue &&
    left.empireValue === right.empireValue
  );
}

export function isLegacyRepairSummaryEqual(
  left: LegacyRepairSummary,
  right: LegacyRepairSummary
): boolean {
  return (
    left.estimatedDurationSec === right.estimatedDurationSec &&
    left.repairingCount === right.repairingCount &&
    left.damagedCount === right.damagedCount
  );
}

function calculateLegacyMainYardBaseValue(save: Save): number {
  const buildingData = asRecord(save.buildingdata);
  if (!buildingData) return 0;

  const includeBuildingInProgress = isOutpostLikeBaseType(save.type);
  let totalCost = 0;

  for (const rawEntry of Object.values(buildingData)) {
    const raw = asRecord(rawEntry);
    if (!raw) continue;

    const typeCode = resolveLegacyBuildingTypeCode(raw);
    if (typeCode === null) continue;

    const rule = legacyMainYardBuildingRules[typeCode];
    if (!rule) continue;
    if (BASE_VALUE_EXCLUDED_CATEGORIES.has(rule.category)) continue;

    const buildingCountdown = parseIntSafe(raw.cB ?? raw.countdownBuild, 0);
    if (!includeBuildingInProgress && buildingCountdown > 0) {
      continue;
    }

    const level = clamp(
      parseIntSafe(raw.l ?? raw.level, 1),
      1,
      Math.max(1, rule.costs.length)
    );
    const levelCost = rule.costs[level - 1];
    if (!levelCost) continue;

    totalCost +=
      parseIntSafe(levelCost.time, 0) +
      parseIntSafe(levelCost.r1, 0) +
      parseIntSafe(levelCost.r2, 0) +
      parseIntSafe(levelCost.r3, 0) +
      parseIntSafe(levelCost.r4, 0);
  }

  return Math.max(0, Math.ceil(totalCost * 0.1));
}

function isMainYardLikeBaseType(baseType: string): boolean {
  return baseType === BaseType.MAIN || baseType === BaseType.INFERNO;
}

function isOutpostLikeBaseType(baseType: string): boolean {
  return baseType === BaseType.OUTPOST || baseType === BaseType.INFERNO_TRIBE;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
