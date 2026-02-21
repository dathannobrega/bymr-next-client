import { Save } from "../../models/save.model.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import {
  applyLegacyRuleDerivedStats,
  getLegacyRuleDerivedStats,
  resolveLegacyBuildingTypeCode,
} from "./legacyBuildingRuleEffects.js";

type BuildingRecord = Record<string, unknown>;

export type LegacyBuildingProgressResult = {
  changed: boolean;
  appliedElapsedSec: number;
  completedUpgrades: Array<{
    id: string;
    fromLevel: number;
    toLevel: number;
  }>;
  completedFortifications: Array<{
    id: string;
    fromLevel: number;
    toLevel: number;
  }>;
};

const MAX_FORTIFICATION_LEVEL = 4;

export function applyLegacyBuildingProgress(
  save: Save,
  nowSec: number = getCurrentDateTime(),
  opts?: {
    baselineSec?: number;
  }
): LegacyBuildingProgressResult {
  const baselineSec = Number.isFinite(opts?.baselineSec)
    ? Math.max(0, Math.trunc(opts?.baselineSec ?? 0))
    : parseIntSafe(save.savetime, 0);
  const elapsedSec = Math.max(0, nowSec - baselineSec);
  if (elapsedSec <= 0) {
    return {
      changed: false,
      appliedElapsedSec: 0,
      completedUpgrades: [],
      completedFortifications: [],
    };
  }

  const buildingData = asRecord(save.buildingdata);
  if (!buildingData) {
    return {
      changed: false,
      appliedElapsedSec: elapsedSec,
      completedUpgrades: [],
      completedFortifications: [],
    };
  }

  let changed = false;
  const completedUpgrades: LegacyBuildingProgressResult["completedUpgrades"] = [];
  const completedFortifications: LegacyBuildingProgressResult["completedFortifications"] = [];

  for (const [key, rawValue] of Object.entries(buildingData)) {
    const raw = asRecord(rawValue);
    if (!raw) continue;

    const id = String(raw.id ?? key);
    const fromLevel = Math.max(1, parseIntSafe(raw.l ?? raw.level, 1));
    const fromFortification = clampFortificationLevel(
      parseIntSafe(raw.fort ?? raw.fortification, 0)
    );
    const initialBusySec = getMaxBusyCountdown(raw);

    const buildTick = tickCountdown(raw, "cB", "countdownBuild", elapsedSec);
    const fortifyTick = tickFortifyCountdown(raw, elapsedSec, fromFortification);
    const typeCode = resolveLegacyBuildingTypeCode(raw);
    const currentLevel = Math.max(1, parseIntSafe(raw.l ?? raw.level, 1));
    let activeLevel = currentLevel;
    if (typeCode !== null) {
      if (applyLegacyRuleDerivedStats(raw, typeCode, currentLevel, { clampHarvesterStored: true })) {
        changed = true;
      }
    }

    const upgradeTick = tickUpgradeCountdown(raw, elapsedSec);

    changed = changed || buildTick.changed || fortifyTick.changed || upgradeTick.changed;

    if (upgradeTick.completedToLevel !== null) {
      const toLevel = Math.max(1, upgradeTick.completedToLevel);
      raw.l = toLevel;
      raw.level = toLevel;
      activeLevel = toLevel;
      if (typeCode !== null) {
        applyLegacyRuleDerivedStats(raw, typeCode, toLevel, {
          forceFullHp: true,
          clampHarvesterStored: true,
        });
      }
      completedUpgrades.push({
        id,
        fromLevel,
        toLevel,
      });
      changed = true;
    }

    if (fortifyTick.completedToLevel !== null) {
      const toLevel = clampFortificationLevel(fortifyTick.completedToLevel);
      completedFortifications.push({
        id,
        fromLevel: fromFortification,
        toLevel,
      });
      changed = true;
    }

    if (typeCode !== null) {
      const repairTick = tickAutoRepair(raw, typeCode, elapsedSec);
      if (repairTick.changed) {
        changed = true;
      }
    }

    if (!isMainYardHarvester(typeCode)) {
      continue;
    }

    const activeElapsedSec = Math.max(0, elapsedSec - initialBusySec);
    if (activeElapsedSec <= 0) continue;

    if (tickHarvesterProduction(raw, typeCode, activeLevel, activeElapsedSec)) {
      changed = true;
    }
  }

  return {
    changed,
    appliedElapsedSec: elapsedSec,
    completedUpgrades,
    completedFortifications,
  };
}

function tickCountdown(
  raw: BuildingRecord,
  shortKey: string,
  longKey: string,
  elapsedSec: number
): { changed: boolean } {
  const pending = parseIntSafe(raw[shortKey] ?? raw[longKey], 0);
  if (pending <= 0) return { changed: false };

  const next = Math.max(0, pending - elapsedSec);
  raw[shortKey] = next;
  raw[longKey] = next;

  return { changed: next !== pending };
}

function tickUpgradeCountdown(
  raw: BuildingRecord,
  elapsedSec: number
): { changed: boolean; completedToLevel: number | null } {
  const pending = parseIntSafe(raw.cU ?? raw.countdownUpgrade, 0);
  if (pending <= 0) {
    return {
      changed: false,
      completedToLevel: null,
    };
  }

  const next = Math.max(0, pending - elapsedSec);
  raw.cU = next;
  raw.countdownUpgrade = next;

  if (next > 0) {
    return {
      changed: next !== pending,
      completedToLevel: null,
    };
  }

  const targetLevel = Math.max(1, parseIntSafe(raw.upgradeToLevel, 0));
  delete raw.upgradeToLevel;
  delete raw.upgradeStartedAt;
  return {
    changed: true,
    completedToLevel: targetLevel > 0 ? targetLevel : null,
  };
}

function tickFortifyCountdown(
  raw: BuildingRecord,
  elapsedSec: number,
  currentFortification: number
): { changed: boolean; completedToLevel: number | null } {
  const pending = parseIntSafe(raw.cF ?? raw.countdownFortify, 0);
  if (pending <= 0) {
    return {
      changed: false,
      completedToLevel: null,
    };
  }

  const next = Math.max(0, pending - elapsedSec);
  raw.cF = next;
  raw.countdownFortify = next;

  if (next > 0) {
    return {
      changed: next !== pending,
      completedToLevel: null,
    };
  }

  const normalizedCurrent = clampFortificationLevel(currentFortification);
  const nextFortification = clampFortificationLevel(normalizedCurrent + 1);
  raw.fort = nextFortification;
  raw.fortification = nextFortification;

  return {
    changed: true,
    completedToLevel:
      nextFortification !== normalizedCurrent ? nextFortification : null,
  };
}

function tickHarvesterProduction(
  raw: BuildingRecord,
  typeCode: number,
  level: number,
  elapsedSec: number
): boolean {
  const derived = getLegacyRuleDerivedStats(typeCode, level);
  const producePerCycle = derived.collectorProducePerCycle;
  const cycleSec = derived.collectorCycleSec;
  const capacity = derived.collectorCapacity;
  const hasCapacity = capacity > 0;

  if (producePerCycle <= 0 || cycleSec <= 0 || !hasCapacity) return false;

  const stored = clampNonNegative(parseIntSafe(raw.st ?? raw.stored, 0));
  if (stored >= capacity) {
    const progress = clampNonNegative(parseIntSafe(raw.pr ?? raw.progress, 0));
    if (progress !== 0) {
      raw.pr = 0;
      raw.progress = 0;
      return true;
    }
    return false;
  }

  const progress = clampNonNegative(parseIntSafe(raw.pr ?? raw.progress, 0));
  const totalProgress = progress + elapsedSec;
  const cycles = Math.floor(totalProgress / cycleSec);
  const produced = cycles * producePerCycle;
  const nextStored = Math.min(capacity, stored + produced);
  const remainingProgress = nextStored >= capacity ? 0 : totalProgress % cycleSec;

  raw.st = nextStored;
  raw.stored = nextStored;
  raw.pr = remainingProgress;
  raw.progress = remainingProgress;

  return nextStored !== stored || remainingProgress !== progress;
}

function tickAutoRepair(
  raw: BuildingRecord,
  typeCode: number,
  elapsedSec: number
): { changed: boolean } {
  const repairing = isRepairing(raw);
  if (isBuildingBusy(raw)) {
    if (repairing) {
      setRepairing(raw, false);
      return { changed: true };
    }
    return { changed: false };
  }

  const level = Math.max(1, parseIntSafe(raw.l ?? raw.level, 1));
  const derived = getLegacyRuleDerivedStats(typeCode, level);
  if (derived.maxHp <= 0 || derived.repairTimeSec <= 0) {
    return { changed: false };
  }

  const hp = clampNonNegative(parseIntSafe(raw.hp, derived.maxHp));
  const maxHp = derived.maxHp;
  const boundedHp = Math.min(maxHp, hp);
  if (boundedHp !== hp) {
    raw.hp = boundedHp;
  }

  if (boundedHp >= maxHp) {
    if (repairing) {
      setRepairing(raw, false);
      return { changed: true };
    }
    return { changed: boundedHp !== hp };
  }

  if (!repairing) {
    return { changed: boundedHp !== hp };
  }

  const healPerSec = maxHp / derived.repairTimeSec;
  const healed = Math.max(1, Math.trunc(healPerSec * elapsedSec));
  const nextHp = Math.min(maxHp, boundedHp + healed);
  if (nextHp === boundedHp) {
    return { changed: boundedHp !== hp };
  }

  raw.hp = nextHp;
  if (nextHp >= maxHp) {
    setRepairing(raw, false);
  }
  return { changed: true };
}

function isMainYardHarvester(typeCode: number | null): typeCode is 1 | 2 | 3 | 4 {
  return typeCode === 1 || typeCode === 2 || typeCode === 3 || typeCode === 4;
}

function getMaxBusyCountdown(raw: BuildingRecord): number {
  const cB = clampNonNegative(parseIntSafe(raw.cB ?? raw.countdownBuild, 0));
  const cU = clampNonNegative(parseIntSafe(raw.cU ?? raw.countdownUpgrade, 0));
  const cF = clampNonNegative(parseIntSafe(raw.cF ?? raw.countdownFortify, 0));
  return Math.max(cB, cU, cF);
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function clampFortificationLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_FORTIFICATION_LEVEL, Math.max(0, Math.trunc(value)));
}

function isBuildingBusy(raw: BuildingRecord): boolean {
  return (
    parseIntSafe(raw.cB ?? raw.countdownBuild, 0) > 0 ||
    parseIntSafe(raw.cU ?? raw.countdownUpgrade, 0) > 0 ||
    parseIntSafe(raw.cF ?? raw.countdownFortify, 0) > 0
  );
}

function isRepairing(raw: BuildingRecord): boolean {
  return parseIntSafe(raw.rE ?? raw.repairing, 0) > 0;
}

function setRepairing(raw: BuildingRecord, repairing: boolean): void {
  const numeric = repairing ? 1 : 0;
  raw.rE = numeric;
  raw.repairing = numeric;
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
