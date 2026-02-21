import { createHash } from "node:crypto";

import { monsterStats } from "../../data/monsterStats.js";
import { BaseType } from "../../enums/Base.js";
import type { Save } from "../../models/save.model.js";
import type { User } from "../../models/user.model.js";
import { normalizeBuildingTypeInput } from "../../utils/buildingType.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import {
  type CombatReplayFrame,
  type CombatReplayResult,
  type CombatReplaySession,
} from "../../zod/CombatReplaySchema.js";
import { parseIntSafe, toResourceSummary } from "../state/normalizeState.js";
import { getLegacyRuleDerivedStats } from "../state/legacyBuildingRuleEffects.js";

const REPLAY_TTL_SECONDS = 60 * 15;
const BASE_FALLBACK_ATTACKER_HP = 2400;
const BASE_FALLBACK_DEFENDER_HP = 3200;
const MIN_TICK_SECONDS = 0.1;
const YARD_WIDTH = 20;
const YARD_HEIGHT = 14;
const STORAGE_LOOT_MAX_TH = 10_000_000;
const STORAGE_LOOT_MAX_OUTPOST = 10_000_000;
const STORAGE_LOOT_MAX_SILO = 4_000_000;
const STORAGE_LOOT_MAX_WM_TH = 2_000_000;
const STORAGE_LOOT_MAX_WM_SILO = 500_000;
const STORAGE_LOOT_PCT_TH = 0.1;
const STORAGE_LOOT_PCT_OUTPOST = 0.05;
const STORAGE_LOOT_PCT_BASE = 0.04;
const STORAGE_LOOT_GOO_LIMITER = 0.5;
const AA_BURST_BY_LEVEL = [4, 4, 6, 8, 10, 12, 14, 16] as const;

type TargetType = "player" | "wild";
type CombatPool = "hq" | "defense" | "resource" | "storage" | "wall" | "utility" | "other";
type PathMode = "direct" | "ground";
type TowerTargetMode = "ground" | "air" | "mixed";

type DefenderAttackPattern = {
  maxTargets: number;
  pierceTargets: number;
  splashRadius: number;
  splashRatio: number;
  burstShots: number;
};

type Point2 = {
  x: number;
  y: number;
};

type BuildReplaySessionInput = {
  replayId: string;
  attackerUser: User;
  attackerSave: Save;
  defenderSave: Save;
  targetType: TargetType;
  durationSec: number;
  tickMs: number;
};

type AttackerGroup = {
  key: string;
  monsterKey: string;
  groupId: number;
  targetPriority: CombatPool[];
  unitCount: number;
  hp: number;
  hpMax: number;
  hpPerUnit: number;
  baseDamagePerUnit: number;
  supportPowerPerUnit: number;
  attackCooldownSec: number;
  attackTimerSec: number;
  rangeTiles: number;
  speedTilesPerSec: number;
  projectileSpeedTilesPerSec: number;
  pathMode: PathMode;
  movementMode: string | null;
  isFlyer: boolean;
  explodeCharges: number;
  splitFactor: number;
  splitHpRatio: number;
  splitDamageRatio: number;
  splitDamageBonus: number;
  zombieHealthMultiplier: number;
  zombieSpeedMultiplier: number;
  zombieDamageMultiplier: number;
  resurrectCooldownSec: number;
  resurrectTimerSec: number;
  zombieBoostSec: number;
  position: Point2;
};

type AttackerProfile = {
  hpMax: number;
  dps: number;
  power: number;
  groups: AttackerGroup[];
};

type DefenderUnit = {
  id: string;
  code: number;
  level: number;
  pool: CombatPool;
  hp: number;
  maxHp: number;
  fortification: number;
  busy: boolean;
  baseDps: number;
  x: number;
  y: number;
  rangeTiles: number;
  cooldownSec: number;
  attackTimerSec: number;
  projectileSpeedTilesPerSec: number;
  targetMode: TowerTargetMode;
  attackPattern: DefenderAttackPattern;
};

type DefenderProfile = {
  hpMax: number;
  dps: number;
  power: number;
  units: DefenderUnit[];
};

type CombatSimulationSummary = {
  attackerHpMax: number;
  attackerHpRemaining: number;
  defenderHpMax: number;
  defenderHpRemaining: number;
  hqDestroyed: boolean;
};

type AttackerProjectile = {
  sourceKey: string;
  targetId: string;
  damage: number;
  etaSec: number;
  splashRadius: number;
  splashRatio: number;
  priority: CombatPool[];
};

type DefenderProjectile = {
  sourceX: number;
  sourceY: number;
  targetKey: string;
  targetMode: TowerTargetMode;
  damage: number;
  etaSec: number;
  maxTargets: number;
  pierceTargets: number;
  splashRadius: number;
  splashRatio: number;
  burstShots: number;
};

type ResourceSummary = {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
};

export function buildCombatReplaySession(
  input: BuildReplaySessionInput
): CombatReplaySession {
  const createdAt = getCurrentDateTime();
  const expiresAt = createdAt + REPLAY_TTL_SECONDS;
  const totalTicks = Math.max(1, Math.trunc((input.durationSec * 1000) / input.tickMs));
  const seed = buildDeterministicSeed(input.attackerUser.userid, input.replayId, input.defenderSave.baseid);
  const rng = createDeterministicRng(seed);

  const attackerLevel = Math.max(1, parseIntSafe(input.attackerSave.level, 1));
  const attackerBaseValue = Math.max(0, parseIntSafe(input.attackerSave.basevalue, 0));
  const defenderLevel = Math.max(1, parseIntSafe(input.defenderSave.level, 1));
  const defenderBaseValue = Math.max(0, parseIntSafe(input.defenderSave.basevalue, 0));
  const attackerFallbackPower = deriveCombatPower(attackerLevel, attackerBaseValue);
  const defenderFallbackPower = deriveCombatPower(defenderLevel, defenderBaseValue);

  const attackerProfile = buildAttackerProfile(
    input.attackerSave,
    attackerLevel,
    attackerFallbackPower,
    rng
  );
  const defenderProfile = buildDefenderProfile(
    input.defenderSave,
    defenderLevel,
    defenderFallbackPower
  );

  const { frames, summary, initialUnits, finalUnits } = simulateCombat({
    createdAt,
    tickMs: input.tickMs,
    totalTicks,
    rng,
    attacker: attackerProfile,
    defender: defenderProfile,
  });

  const result = buildCombatResult(
    frames,
    createdAt,
    input.tickMs,
    input.defenderSave,
    input.targetType,
    rng,
    summary,
    initialUnits,
    finalUnits
  );
  const attackerPower = Math.max(attackerFallbackPower, attackerProfile.power);
  const defenderPower = Math.max(defenderFallbackPower, defenderProfile.power);

  return {
    schemaVersion: 1,
    replayId: input.replayId,
    userId: input.attackerUser.userid,
    targetBaseId: input.defenderSave.baseid,
    createdAt,
    expiresAt,
    tickMs: input.tickMs,
    totalTicks: frames.length,
    seed,
    attacker: {
      userId: input.attackerUser.userid,
      username: input.attackerUser.username,
      baseId: String(input.attackerSave.baseid),
      level: attackerLevel,
      power: attackerPower,
      hpMax: summary.attackerHpMax,
    },
    defender: {
      userId: Math.max(0, parseIntSafe(input.defenderSave.saveuserid ?? input.defenderSave.userid, 0)),
      username: input.defenderSave.name || "Wild Monsters",
      baseId: String(input.defenderSave.baseid),
      level: defenderLevel,
      power: defenderPower,
      hpMax: summary.defenderHpMax,
      targetType: input.targetType,
    },
    frames,
    result,
  };
}

function buildCombatResult(
  frames: CombatReplayFrame[],
  createdAt: number,
  tickMs: number,
  defenderSave: Save,
  targetType: TargetType,
  rng: () => number,
  summary: CombatSimulationSummary,
  initialUnits: DefenderUnit[],
  finalUnits: DefenderUnit[]
): CombatReplayResult {
  const lastFrame = frames.at(-1);
  if (!lastFrame) {
    return {
      winner: "draw",
      endedAt: createdAt,
      durationTicks: 1,
      loot: { r1: 0, r2: 0, r3: 0, r4: 0 },
    };
  }

  const winner = resolveWinner(summary, lastFrame);
  const endedAt = createdAt + Math.max(1, Math.trunc((lastFrame.tick * tickMs) / 1000));
  const destroyedRatio = computeDestroyedRatio(summary);
  const loot = winner === "attacker"
    ? deriveLoot(defenderSave, targetType, rng, destroyedRatio, initialUnits, finalUnits)
    : { r1: 0, r2: 0, r3: 0, r4: 0 };

  return {
    winner,
    endedAt,
    durationTicks: lastFrame.tick,
    loot,
  };
}

function resolveWinner(
  summary: CombatSimulationSummary,
  frame: CombatReplayFrame
): "attacker" | "defender" | "draw" {
  if (summary.hqDestroyed && frame.attackerHp > 0) return "attacker";
  if (frame.defenderHp === 0 && frame.attackerHp > 0) return "attacker";
  if (frame.attackerHp === 0 && frame.defenderHp > 0) return "defender";
  if (frame.attackerHp === 0 && frame.defenderHp === 0) return "draw";

  const attackerProgress = computeDestroyedRatio(summary);
  const defenderProgress = 1 - clamp(frame.attackerHp / Math.max(1, summary.attackerHpMax), 0, 1);
  if (attackerProgress > defenderProgress + 0.04) return "attacker";
  if (defenderProgress > attackerProgress + 0.04) return "defender";
  return "draw";
}

function deriveLoot(
  defenderSave: Save,
  targetType: TargetType,
  rng: () => number,
  destroyedRatio: number,
  initialUnits: DefenderUnit[],
  finalUnits: DefenderUnit[]
): ResourceSummary {
  const resources = normalizeResourceSummary(toResourceSummary(defenderSave.resources));
  const storageLoot = deriveLegacyStorageLoot(defenderSave, resources, initialUnits, finalUnits);
  const storageLootTotal = sumResourceSummary(storageLoot);
  const storageDamageRatio = computeStorageDamageRatio(initialUnits, finalUnits);

  // Legacy BSTORAGE has both destruction-loot and chip-loot while storages take damage.
  const ambientBase = storageDamageRatio > 0
    ? 0.035 + storageDamageRatio * 0.2
    : 0.01;
  const ambientFactor = storageLootTotal > 0
    ? clamp(ambientBase * 0.5 + destroyedRatio * 0.06 + rng() * 0.02, 0, 0.16)
    : clamp(ambientBase + destroyedRatio * 0.1 + rng() * 0.03, 0, 0.24);
  const ambientLoot = scaleResourceSummary(resources, ambientFactor);
  const mergedLoot = mergeLootWithResourceCap(resources, storageLoot, ambientLoot);

  return scaleLootByTargetType(mergedLoot, targetType);
}

function deriveCombatPower(level: number, baseValue: number): number {
  const levelWeight = level * 12;
  const baseWeight = Math.log10(baseValue + 10) * 18;
  return Math.max(1, Math.round(levelWeight + baseWeight));
}

function buildAttackerProfile(
  attackerSave: Save,
  attackerLevel: number,
  fallbackPower: number,
  rng: () => number
): AttackerProfile {
  const groups: AttackerGroup[] = [];
  const monsters = asRecord(attackerSave.monsters);
  const housed = asRecord(monsters?.housed);
  const lockerData = asRecord(attackerSave.lockerdata);
  let groupIndex = 0;

  if (housed) {
    for (const [rawMonsterKey, rawCount] of Object.entries(housed)) {
      const monsterKey = rawMonsterKey.trim().toUpperCase();
      if (!monsterKey) continue;

      const count = Math.max(0, parseIntSafe(rawCount, 0));
      if (count <= 0) continue;

      const stat = monsterStats[monsterKey];
      if (!stat) continue;

      const lockerEntry = asRecord(lockerData?.[monsterKey]);
      const monsterLevel = Math.max(1, parseIntSafe(lockerEntry?.t, 1));
      const hpPerUnit = Math.max(1, pickLeveledStat(stat.props.health, monsterLevel, 100));
      const rawDamagePerHit = pickLeveledStat(stat.props.damage, monsterLevel, 20);
      const baseDamagePerUnit = Math.max(0, rawDamagePerHit);
      const supportPowerPerUnit = Math.max(0, -rawDamagePerHit);
      const attackCycleFrames = Math.max(6, pickLeveledStat(stat.props.cTime, monsterLevel, 30));
      const attackCooldownSec = Math.max(0.25, attackCycleFrames / 30);
      const targetGroup = Math.max(1, parseIntSafe(stat.props.targetGroup?.[0], 1));
      const rangeTiles = deriveMonsterRangeTiles(stat.props.range, monsterLevel);
      const speedTilesPerSec = deriveMonsterSpeedTilesPerSec(stat.props.speed, monsterLevel);
      const projectileSpeedTilesPerSec = deriveMonsterProjectileSpeedTilesPerSec(
        stat.props.range,
        stat.props.attackDelay,
        monsterLevel,
        rangeTiles
      );
      const explodeEnabled = pickLeveledStat(stat.props.explode, monsterLevel, 0) > 0;
      const splitFactor = Math.max(0, Math.trunc(pickLeveledStat(stat.props.splits, monsterLevel, 0)));
      const zombieHealthMultiplier = Math.max(
        1,
        pickLeveledStat(stat.props.zombieHealthMultiplier, monsterLevel, 1)
      );
      const zombieSpeedMultiplier = Math.max(
        1,
        pickLeveledStat(stat.props.zombieSpeedMultiplier, monsterLevel, 1)
      );
      const zombieDamageMultiplier = Math.max(
        1,
        pickLeveledStat(stat.props.zombieDamageMultiplier, monsterLevel, 1)
      );
      const resurrectCooldownSec = Math.max(
        0,
        pickLeveledStat(stat.props.resurrectCooldown, monsterLevel, 0)
      );
      const pathMode = resolvePathMode(stat.pathing, stat.movement);
      const movementMode = normalizeTextToken(stat.movement);
      const isFlyer = movementMode === "fly";
      const position = sampleSpawnPosition(groupIndex, rng);

      groups.push({
        key: `${monsterKey}:${groupIndex}`,
        monsterKey,
        groupId: targetGroup,
        targetPriority: resolveAttackerTargetPriority(targetGroup, supportPowerPerUnit > 0),
        unitCount: count,
        hp: hpPerUnit * count,
        hpMax: hpPerUnit * count,
        hpPerUnit,
        baseDamagePerUnit,
        supportPowerPerUnit,
        attackCooldownSec,
        attackTimerSec: 0,
        rangeTiles,
        speedTilesPerSec,
        projectileSpeedTilesPerSec,
        pathMode,
        movementMode,
        isFlyer,
        explodeCharges: explodeEnabled ? count : 0,
        splitFactor,
        splitHpRatio: 0.22,
        splitDamageRatio: 0.08,
        splitDamageBonus: 0,
        zombieHealthMultiplier,
        zombieSpeedMultiplier,
        zombieDamageMultiplier,
        resurrectCooldownSec,
        resurrectTimerSec: resurrectCooldownSec,
        zombieBoostSec: 0,
        position,
      });
      groupIndex += 1;
    }
  }

  const siegeWeaponDps = deriveSiegeWeaponDps(attackerSave);
  if (siegeWeaponDps > 0) {
    const siegeHp = 950 + attackerLevel * 120;
    const siegeAttackCooldownSec = 1.8;
    const position = sampleSpawnPosition(groupIndex, rng);
    groups.push({
      key: `SIEGE:${groupIndex}`,
      monsterKey: "SIEGE",
      groupId: 1,
      targetPriority: ["defense", "hq", "resource", "storage", "utility", "wall", "other"],
      unitCount: 1,
      hp: siegeHp,
      hpMax: siegeHp,
      hpPerUnit: siegeHp,
      baseDamagePerUnit: siegeWeaponDps * siegeAttackCooldownSec,
      supportPowerPerUnit: 0,
      attackCooldownSec: siegeAttackCooldownSec,
      attackTimerSec: 0,
      rangeTiles: 10,
      speedTilesPerSec: 0.45,
      projectileSpeedTilesPerSec: 12,
      pathMode: "ground",
      movementMode: null,
      isFlyer: false,
      explodeCharges: 0,
      splitFactor: 0,
      splitHpRatio: 0,
      splitDamageRatio: 0,
      splitDamageBonus: 0,
      zombieHealthMultiplier: 1,
      zombieSpeedMultiplier: 1,
      zombieDamageMultiplier: 1,
      resurrectCooldownSec: 0,
      resurrectTimerSec: 0,
      zombieBoostSec: 0,
      position,
    });
  }

  let hpMax = Math.round(groups.reduce((sum, group) => sum + group.hp, 0));
  let dps = groups.reduce((sum, group) => {
    if (group.baseDamagePerUnit <= 0) return sum;
    const effectiveCount = Math.max(0.25, group.hp / Math.max(1, group.hpPerUnit));
    return sum + (group.baseDamagePerUnit * effectiveCount) / Math.max(0.25, group.attackCooldownSec);
  }, 0);

  if (groups.length === 0 || hpMax <= 0 || dps <= 0) {
    const fallbackHp = BASE_FALLBACK_ATTACKER_HP + fallbackPower * 14;
    const fallbackDps = 45 + fallbackPower * 1.35;
    const fallbackAttackCooldownSec = 1.25;
    const fallbackPerUnitDamage = fallbackDps * fallbackAttackCooldownSec / Math.max(1, attackerLevel);
    const fallbackUnits = Math.max(12, attackerLevel * 5);
    groups.length = 0;
    groups.push({
      key: "fallback:0",
      monsterKey: "fallback",
      groupId: 1,
      targetPriority: resolveAttackerTargetPriority(1, false),
      unitCount: fallbackUnits,
      hp: fallbackHp,
      hpMax: fallbackHp,
      hpPerUnit: Math.max(1, fallbackHp / fallbackUnits),
      baseDamagePerUnit: Math.max(1, fallbackPerUnitDamage),
      supportPowerPerUnit: 0,
      attackCooldownSec: fallbackAttackCooldownSec,
      attackTimerSec: 0,
      rangeTiles: 6.2,
      speedTilesPerSec: 2.6,
      projectileSpeedTilesPerSec: 10,
      pathMode: "direct",
      movementMode: null,
      isFlyer: false,
      explodeCharges: 0,
      splitFactor: 0,
      splitHpRatio: 0,
      splitDamageRatio: 0,
      splitDamageBonus: 0,
      zombieHealthMultiplier: 1,
      zombieSpeedMultiplier: 1,
      zombieDamageMultiplier: 1,
      resurrectCooldownSec: 0,
      resurrectTimerSec: 0,
      zombieBoostSec: 0,
      position: sampleSpawnPosition(0, rng),
    });
    hpMax = Math.round(fallbackHp);
    dps = fallbackDps;
  }

  const power = Math.max(
    1,
    Math.round(dps / 7 + hpMax / 550 + attackerLevel * 8)
  );

  return {
    hpMax: Math.max(1, hpMax),
    dps: Math.max(1, dps),
    power,
    groups,
  };
}

function buildDefenderProfile(
  defenderSave: Save,
  defenderLevel: number,
  fallbackPower: number
): DefenderProfile {
  const units: DefenderUnit[] = [];
  const buildingData = asRecord(defenderSave.buildingdata);

  if (buildingData) {
    for (const [key, rawValue] of Object.entries(buildingData)) {
      const raw = asRecord(rawValue);
      if (!raw) continue;

      const typeCode = resolveBuildingTypeCode(raw);
      if (!typeCode) continue;

      const level = Math.max(1, parseIntSafe(raw.l ?? raw.level, 1));
      const pool = classifyBuildingPool(typeCode);
      const legacyRuleHp = getLegacyRuleDerivedStats(typeCode, level).maxHp;
      const fallbackMaxHp = legacyRuleHp > 0
        ? legacyRuleHp
        : deriveFallbackBuildingHp(typeCode, pool, level);
      const maxHp = Math.max(
        1,
        parseIntSafe(raw.maxHp ?? raw.maxHealth ?? raw.health, Math.round(fallbackMaxHp))
      );
      const hp = clamp(
        parseIntSafe(raw.hp ?? raw.health, maxHp),
        0,
        maxHp
      );
      const fortification = clamp(parseIntSafe(raw.fort ?? raw.fortification, 0), 0, 4);
      const busy = isBuildingBusyForCombat(raw);
      const baseDps = busy ? 0 : deriveBuildingBaseDps(typeCode, level);
      const attackProfile = deriveDefenseAttackProfile(typeCode, level);
      const footprintW = Math.max(1, parseIntSafe(raw.fw ?? raw.footprintW, 1));
      const footprintH = Math.max(1, parseIntSafe(raw.fh ?? raw.footprintH, 1));
      const x = clamp(parseIntSafe(raw.x ?? raw.X, 0) + footprintW / 2, 0, YARD_WIDTH);
      const y = clamp(parseIntSafe(raw.y ?? raw.Y, 0) + footprintH / 2, 0, YARD_HEIGHT);

      units.push({
        id: String(raw.id ?? key),
        code: typeCode,
        level,
        pool,
        hp,
        maxHp,
        fortification,
        busy,
        baseDps,
        x,
        y,
        rangeTiles: attackProfile.rangeTiles,
        cooldownSec: attackProfile.cooldownSec,
        attackTimerSec: 0,
        projectileSpeedTilesPerSec: attackProfile.projectileSpeedTilesPerSec,
        targetMode: attackProfile.targetMode,
        attackPattern: attackProfile.pattern,
      });
    }
  }

  if (units.length === 0) {
    const fallbackHqHp = BASE_FALLBACK_DEFENDER_HP + fallbackPower * 18;
    const fallbackDefenseHp = 1400 + fallbackPower * 9;
    units.push({
      id: "hq-fallback",
      code: 14,
      level: 1,
      pool: "hq",
      hp: fallbackHqHp,
      maxHp: fallbackHqHp,
      fortification: 0,
      busy: false,
      baseDps: 0,
      x: YARD_WIDTH / 2,
      y: YARD_HEIGHT / 2,
      rangeTiles: 0,
      cooldownSec: 1,
      attackTimerSec: 0,
      projectileSpeedTilesPerSec: 0,
      targetMode: "ground",
      attackPattern: emptyDefenderAttackPattern(),
    });
    units.push({
      id: "defense-fallback",
      code: 20,
      level: 1,
      pool: "defense",
      hp: fallbackDefenseHp,
      maxHp: fallbackDefenseHp,
      fortification: 0,
      busy: false,
      baseDps: 40 + fallbackPower,
      x: YARD_WIDTH / 2 + 2,
      y: YARD_HEIGHT / 2 + 1,
      rangeTiles: 6,
      cooldownSec: 1.35,
      attackTimerSec: 0,
      projectileSpeedTilesPerSec: 9,
      targetMode: "ground",
      attackPattern: {
        maxTargets: 1,
        pierceTargets: 0,
        splashRadius: 1.6,
        splashRatio: 0.2,
        burstShots: 1,
      },
    });
  }

  const hpMax = Math.max(1, Math.round(sumUnitHp(units)));
  const dps = Math.max(1, calculateDefenderDps(units));
  const power = Math.max(
    1,
    Math.round(dps / 6.5 + hpMax / 700 + defenderLevel * 9)
  );

  return {
    hpMax,
    dps,
    power,
    units,
  };
}

function resolveBuildingTypeCode(raw: Record<string, unknown>): number | null {
  const byCode = parseIntSafe(raw.t, Number.NaN);
  if (Number.isFinite(byCode) && byCode > 0) return byCode;

  if (typeof raw.type === "string") {
    const normalized = normalizeBuildingTypeInput(raw.type);
    if (normalized) return normalized.code;
  }

  return null;
}

function isBuildingBusyForCombat(raw: Record<string, unknown>): boolean {
  return (
    parseIntSafe(raw.cB ?? raw.countdownBuild, 0) > 0 ||
    parseIntSafe(raw.cU ?? raw.countdownUpgrade, 0) > 0 ||
    parseIntSafe(raw.cF ?? raw.countdownFortify, 0) > 0
  );
}

function classifyBuildingPool(typeCode: number): CombatPool {
  if (typeCode === 14) return "hq";
  if (typeCode === 17 || typeCode === 18) return "wall";
  if (typeCode === 1 || typeCode === 2 || typeCode === 3 || typeCode === 4 || typeCode === 5 || typeCode === 7) {
    return "resource";
  }
  if (typeCode === 6 || typeCode === 112) return "storage";
  if (
    typeCode === 20 ||
    typeCode === 21 ||
    typeCode === 22 ||
    typeCode === 23 ||
    typeCode === 24 ||
    typeCode === 25 ||
    typeCode === 115 ||
    typeCode === 117 ||
    typeCode === 118
  ) {
    return "defense";
  }
  if (
    typeCode === 8 ||
    typeCode === 9 ||
    typeCode === 10 ||
    typeCode === 11 ||
    typeCode === 12 ||
    typeCode === 13 ||
    typeCode === 15 ||
    typeCode === 16 ||
    typeCode === 19 ||
    typeCode === 26 ||
    typeCode === 27 ||
    typeCode === 51 ||
    typeCode === 113
  ) {
    return "utility";
  }
  return "other";
}

function deriveFallbackBuildingHp(typeCode: number, pool: CombatPool, level: number): number {
  const base = (() => {
    switch (pool) {
      case "hq":
        return 9000;
      case "defense":
        return typeCode === 118 ? 3200 : 2300;
      case "resource":
        return 1700;
      case "storage":
        return 2200;
      case "wall":
        return 1200;
      case "utility":
        return 2000;
      default:
        return 1600;
    }
  })();
  return base * (1 + (level - 1) * 0.26);
}

function deriveBuildingBaseDps(typeCode: number, level: number): number {
  const base = (() => {
    switch (typeCode) {
      case 20:
        return 85;
      case 21:
        return 122;
      case 22:
        return 48;
      case 23:
        return 165;
      case 24:
        return 65;
      case 25:
        return 148;
      case 115:
        return 190;
      case 117:
        return 115;
      case 118:
        return 235;
      default:
        return 0;
    }
  })();

  if (base <= 0) return 0;
  return base * (1 + (level - 1) * 0.21);
}

function deriveDefenseAttackProfile(typeCode: number, level: number): {
  rangeTiles: number;
  cooldownSec: number;
  projectileSpeedTilesPerSec: number;
  targetMode: TowerTargetMode;
  pattern: DefenderAttackPattern;
} {
  const targetMode = resolveTowerTargetMode(typeCode);
  switch (typeCode) {
    case 20:
      return {
        rangeTiles: 6,
        cooldownSec: 1.25,
        projectileSpeedTilesPerSec: 8.5,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 1.7,
          splashRatio: 0.24,
          burstShots: 1,
        },
      };
    case 21:
      return {
        rangeTiles: 9,
        cooldownSec: 2.1,
        projectileSpeedTilesPerSec: 12,
        targetMode,
        pattern: emptyDefenderAttackPattern(),
      };
    case 22:
      return {
        rangeTiles: 7.5,
        cooldownSec: 1.4,
        projectileSpeedTilesPerSec: 9,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 1.25,
          splashRatio: 0.16,
          burstShots: 1,
        },
      };
    case 23:
      return {
        rangeTiles: 8.5,
        cooldownSec: 1.8,
        projectileSpeedTilesPerSec: 15,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 1.1,
          splashRatio: 0.15,
          burstShots: 1,
        },
      };
    case 24:
      return {
        rangeTiles: 6.3,
        cooldownSec: 1.0,
        projectileSpeedTilesPerSec: 999,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 0.9,
          splashRatio: 0.1,
          burstShots: 1,
        },
      };
    case 25:
      return {
        rangeTiles: 9.5,
        cooldownSec: 2.0,
        projectileSpeedTilesPerSec: 16,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 1.35,
          splashRatio: 0.18,
          burstShots: 3,
        },
      };
    case 115:
      return {
        rangeTiles: 9,
        cooldownSec: 1.65,
        projectileSpeedTilesPerSec: 14,
        targetMode,
        pattern: {
          maxTargets: resolveAerialBurstCount(level),
          pierceTargets: 0,
          splashRadius: 0,
          splashRatio: 0,
          burstShots: 1,
        },
      };
    case 117:
      return {
        rangeTiles: 8,
        cooldownSec: 1.5,
        projectileSpeedTilesPerSec: 10,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 0,
          splashRadius: 1.05,
          splashRatio: 0.14,
          burstShots: 1,
        },
      };
    case 118:
      return {
        rangeTiles: 9.8,
        cooldownSec: 1.95,
        projectileSpeedTilesPerSec: 16,
        targetMode,
        pattern: {
          maxTargets: 1,
          pierceTargets: 5,
          splashRadius: 0,
          splashRatio: 0,
          burstShots: 1,
        },
      };
    default:
      return {
        rangeTiles: 5.5,
        cooldownSec: 1.35,
        projectileSpeedTilesPerSec: 9,
        targetMode,
        pattern: emptyDefenderAttackPattern(),
      };
  }
}

function emptyDefenderAttackPattern(): DefenderAttackPattern {
  return {
    maxTargets: 1,
    pierceTargets: 0,
    splashRadius: 0,
    splashRatio: 0,
    burstShots: 1,
  };
}

function resolveTowerTargetMode(typeCode: number): TowerTargetMode {
  if (typeCode === 115) return "air";
  if (typeCode === 21 || typeCode === 25) return "mixed";
  return "ground";
}

function resolveAerialBurstCount(level: number): number {
  const idx = Math.min(Math.max(level - 1, 0), AA_BURST_BY_LEVEL.length - 1);
  return AA_BURST_BY_LEVEL[idx] ?? 4;
}

function simulateCombat(input: {
  createdAt: number;
  tickMs: number;
  totalTicks: number;
  rng: () => number;
  attacker: AttackerProfile;
  defender: DefenderProfile;
}): {
  frames: CombatReplayFrame[];
  summary: CombatSimulationSummary;
  initialUnits: DefenderUnit[];
  finalUnits: DefenderUnit[];
} {
  const initialUnits: DefenderUnit[] = input.defender.units.map((unit) => ({ ...unit }));
  const units: DefenderUnit[] = initialUnits.map((unit) => ({ ...unit }));
  const groups: AttackerGroup[] = input.attacker.groups.map((group) => ({ ...group }));
  const frames: CombatReplayFrame[] = [];
  const tickSeconds = Math.max(MIN_TICK_SECONDS, input.tickMs / 1000);
  const attackerProjectiles: AttackerProjectile[] = [];
  const defenderProjectiles: DefenderProjectile[] = [];

  let attackerShieldPool = 0;
  let attackerHp = sumGroupHp(groups);
  let defenderHp = sumUnitHp(units);

  for (let tick = 1; tick <= input.totalTicks; tick += 1) {
    const attackerCrit = input.rng() < 0.11;
    const defenderCrit = input.rng() < 0.1;
    const attackerVariance = 0.88 + input.rng() * 0.28;
    const defenderVariance = 0.86 + input.rng() * 0.3;

    tickAttackerGroupState(groups, tickSeconds, input.rng);
    attackerShieldPool = Math.max(0, attackerShieldPool - tickSeconds * 14);

    attackerShieldPool += scheduleAttackerActions({
      groups,
      units,
      tickSeconds,
      attackerCrit,
      attackerVariance,
      attackerProjectiles,
    });

    const attackerDamageTick = resolveAttackerProjectiles({
      projectiles: attackerProjectiles,
      units,
      tickSeconds,
      rng: input.rng,
    });

    scheduleDefenderActions({
      units,
      groups,
      tickSeconds,
      defenderCrit,
      defenderVariance,
      projectiles: defenderProjectiles,
    });

    const defenderResolution = resolveDefenderProjectiles({
      projectiles: defenderProjectiles,
      groups,
      tickSeconds,
      shieldPool: attackerShieldPool,
    });
    attackerShieldPool = defenderResolution.nextShieldPool;
    const defenderDamageTick = defenderResolution.damageDealt;

    attackerHp = Math.max(0, sumGroupHp(groups));
    defenderHp = Math.max(0, sumUnitHp(units));
    const hqDestroyed = isPoolDestroyed(units, "hq");

    frames.push({
      tick,
      serverTime: input.createdAt + Math.max(1, Math.trunc((tick * input.tickMs) / 1000)),
      attackerHp: Math.max(0, Math.round(attackerHp)),
      defenderHp: Math.max(0, Math.round(defenderHp)),
      attackerDamage: Math.max(0, Math.round(attackerDamageTick)),
      defenderDamage: Math.max(0, Math.round(defenderDamageTick)),
      attackerCrit,
      defenderCrit,
    });

    if (attackerHp <= 0 || defenderHp <= 0 || hqDestroyed) {
      break;
    }
  }

  if (frames.length === 0) {
    frames.push({
      tick: 1,
      serverTime: input.createdAt + 1,
      attackerHp: Math.max(0, Math.round(attackerHp)),
      defenderHp: Math.max(0, Math.round(defenderHp)),
      attackerDamage: 0,
      defenderDamage: 0,
      attackerCrit: false,
      defenderCrit: false,
    });
  }

  const summary: CombatSimulationSummary = {
    attackerHpMax: Math.max(1, Math.round(input.attacker.hpMax)),
    attackerHpRemaining: Math.max(0, Math.round(attackerHp)),
    defenderHpMax: Math.max(1, Math.round(input.defender.hpMax)),
    defenderHpRemaining: Math.max(0, Math.round(defenderHp)),
    hqDestroyed: isPoolDestroyed(units, "hq"),
  };

  return {
    frames,
    summary,
    initialUnits,
    finalUnits: units.map((unit) => ({ ...unit })),
  };
}

function tickAttackerGroupState(
  groups: AttackerGroup[],
  tickSeconds: number,
  rng: () => number
): void {
  for (const group of groups) {
    if (group.hp <= 0) continue;

    group.attackTimerSec = Math.max(0, group.attackTimerSec - tickSeconds);

    if (group.zombieBoostSec > 0) {
      group.zombieBoostSec = Math.max(0, group.zombieBoostSec - tickSeconds);
    }

    if (group.resurrectCooldownSec > 0) {
      group.resurrectTimerSec -= tickSeconds;
      if (group.resurrectTimerSec <= 0 && group.hp < group.hpMax * 0.75) {
        group.zombieBoostSec = Math.max(group.zombieBoostSec, 4 + rng() * 2);
        group.resurrectTimerSec = group.resurrectCooldownSec;
      }
    }

    group.unitCount = Math.max(0, Math.ceil(group.hp / Math.max(1, group.hpPerUnit)));
  }
}

function scheduleAttackerActions(input: {
  groups: AttackerGroup[];
  units: DefenderUnit[];
  tickSeconds: number;
  attackerCrit: boolean;
  attackerVariance: number;
  attackerProjectiles: AttackerProjectile[];
}): number {
  const wallPressure = computeWallPressure(input.units);
  let shieldGain = 0;

  for (const group of input.groups) {
    if (group.hp <= 0) continue;

    const target = selectDefenderTarget(input.units, group, wallPressure, input.units);
    if (!target) continue;

    const pathDistance = computePathDistance(group, target, wallPressure, input.units);
    if (pathDistance > group.rangeTiles) {
      moveGroupTowards(group, target, input.tickSeconds, wallPressure, input.units);
      continue;
    }

    if (group.attackTimerSec > 0) {
      continue;
    }

    const healthRatio = clamp(group.hp / Math.max(1, group.hpMax), 0.2, 1);

    if (group.supportPowerPerUnit > 0) {
      const support = computeSupportShieldGain(group, healthRatio, input.attackerVariance, input.attackerCrit);
      if (support > 0) {
        shieldGain += support;
      }
      group.attackTimerSec = group.attackCooldownSec;
      continue;
    }

    const shotDamage = computeGroupShotDamage(group, healthRatio, input.attackerVariance, input.attackerCrit);
    if (shotDamage <= 0) {
      group.attackTimerSec = group.attackCooldownSec;
      continue;
    }

    const travelSec = computeProjectileTravelSeconds(pathDistance, group.projectileSpeedTilesPerSec);
    input.attackerProjectiles.push({
      sourceKey: group.key,
      targetId: target.id,
      damage: shotDamage,
      etaSec: travelSec,
      splashRadius: group.explodeCharges > 0 ? 2.2 : 0,
      splashRatio: group.explodeCharges > 0 ? 0.28 : 0,
      priority: group.targetPriority,
    });

    if (group.explodeCharges > 0) {
      consumeExplosiveCharge(group);
    }

    group.attackTimerSec = group.attackCooldownSec;
  }

  return shieldGain;
}

function resolveAttackerProjectiles(input: {
  projectiles: AttackerProjectile[];
  units: DefenderUnit[];
  tickSeconds: number;
  rng: () => number;
}): number {
  let damageDealt = 0;

  for (let index = input.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = input.projectiles[index];
    projectile.etaSec -= input.tickSeconds;
    if (projectile.etaSec > 0) continue;

    input.projectiles.splice(index, 1);

    const target = findDefenderById(input.units, projectile.targetId)
      ?? selectDefenderFallback(input.units, projectile.priority, input.rng);
    if (!target || target.hp <= 0) continue;

    const directDamage = applyDamageToDefender(target, projectile.damage);
    damageDealt += directDamage;

    if (projectile.splashRatio > 0 && projectile.splashRadius > 0 && directDamage > 0) {
      for (const splashTarget of input.units) {
        if (splashTarget.id === target.id || splashTarget.hp <= 0) continue;

        const dist = distanceBetweenPoints(target.x, target.y, splashTarget.x, splashTarget.y);
        if (dist > projectile.splashRadius) continue;

        const falloff = clamp(1 - dist / projectile.splashRadius, 0.25, 1);
        const splashDamage = projectile.damage * projectile.splashRatio * falloff;
        damageDealt += applyDamageToDefender(splashTarget, splashDamage);
      }
    }
  }

  return damageDealt;
}

function scheduleDefenderActions(input: {
  units: DefenderUnit[];
  groups: AttackerGroup[];
  tickSeconds: number;
  defenderCrit: boolean;
  defenderVariance: number;
  projectiles: DefenderProjectile[];
}): void {
  for (const unit of input.units) {
    if (unit.hp <= 0 || unit.baseDps <= 0) continue;

    unit.attackTimerSec = Math.max(0, unit.attackTimerSec - input.tickSeconds);
    if (unit.attackTimerSec > 0) continue;

    const target = selectAttackerTarget(input.groups, unit);
    if (!target) continue;

    const dist = distanceBetweenPoints(unit.x, unit.y, target.position.x, target.position.y);
    if (dist > unit.rangeTiles) {
      unit.attackTimerSec = Math.min(0.45, unit.cooldownSec * 0.35);
      continue;
    }

    const healthRatio = clamp(unit.hp / Math.max(1, unit.maxHp), 0.25, 1);
    let damage = unit.baseDps * unit.cooldownSec * healthRatio * input.defenderVariance;
    if (input.defenderCrit) {
      damage *= 1.28;
    }

    if (damage > 0) {
      const travelSec = computeProjectileTravelSeconds(dist, unit.projectileSpeedTilesPerSec);
      input.projectiles.push({
        sourceX: unit.x,
        sourceY: unit.y,
        targetKey: target.key,
        targetMode: unit.targetMode,
        damage,
        etaSec: travelSec,
        maxTargets: Math.max(1, unit.attackPattern.maxTargets),
        pierceTargets: Math.max(0, unit.attackPattern.pierceTargets),
        splashRadius: Math.max(0, unit.attackPattern.splashRadius),
        splashRatio: clamp(unit.attackPattern.splashRatio, 0, 1),
        burstShots: Math.max(1, unit.attackPattern.burstShots),
      });
    }

    unit.attackTimerSec = unit.cooldownSec;
  }
}

function resolveDefenderProjectiles(input: {
  projectiles: DefenderProjectile[];
  groups: AttackerGroup[];
  tickSeconds: number;
  shieldPool: number;
}): {
  damageDealt: number;
  nextShieldPool: number;
} {
  let damageDealt = 0;
  let shieldPool = input.shieldPool;

  for (let index = input.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = input.projectiles[index];
    projectile.etaSec -= input.tickSeconds;
    if (projectile.etaSec > 0) continue;

    input.projectiles.splice(index, 1);

    const target = findAttackerByKey(input.groups, projectile.targetKey, projectile.targetMode)
      ?? findStrongestAttacker(input.groups, projectile.targetMode);
    if (!target || target.hp <= 0) continue;

    let damage = projectile.damage;
    if (shieldPool > 0) {
      const absorbed = Math.min(shieldPool, damage);
      shieldPool -= absorbed;
      damage -= absorbed;
    }

    if (damage <= 0) continue;

    damageDealt += resolveDefenderProjectileImpact(
      projectile,
      target,
      input.groups,
      damage
    );
  }

  return {
    damageDealt,
    nextShieldPool: Math.max(0, shieldPool),
  };
}

function resolveDefenderProjectileImpact(
  projectile: DefenderProjectile,
  primaryTarget: AttackerGroup,
  groups: AttackerGroup[],
  damage: number
): number {
  let dealt = 0;
  const burstShots = Math.max(1, projectile.burstShots);
  const damagePerBurstShot = damage / burstShots;

  for (let shot = 0; shot < burstShots; shot += 1) {
    const activePrimary = primaryTarget.hp > 0
      ? primaryTarget
      : findStrongestAttacker(groups, projectile.targetMode);
    if (!activePrimary) break;

    dealt += applyDamageToAttackerGroup(activePrimary, damagePerBurstShot);
    const hitKeys = new Set<string>([activePrimary.key]);

    if (projectile.maxTargets > 1) {
      const retargetCount = projectile.maxTargets - 1;
      const retargets = selectNearestAttackerTargets(
        groups,
        projectile.targetMode,
        activePrimary.position,
        hitKeys,
        retargetCount
      );
      if (retargets.length > 0) {
        const sharedRetargetDamage = (damagePerBurstShot * 0.6) / retargets.length;
        for (const candidate of retargets) {
          dealt += applyDamageToAttackerGroup(candidate, sharedRetargetDamage);
          hitKeys.add(candidate.key);
        }
      }
    }

    if (projectile.pierceTargets > 0) {
      const pierced = selectPierceAttackerTargets(
        groups,
        projectile.targetMode,
        projectile.sourceX,
        projectile.sourceY,
        activePrimary.position.x,
        activePrimary.position.y,
        hitKeys,
        projectile.pierceTargets
      );
      if (pierced.length > 0) {
        const sharedPierceDamage = (damagePerBurstShot * 0.9) / pierced.length;
        for (const candidate of pierced) {
          dealt += applyDamageToAttackerGroup(candidate, sharedPierceDamage);
          hitKeys.add(candidate.key);
        }
      }
    }

    if (projectile.splashRadius > 0 && projectile.splashRatio > 0) {
      const splashCandidates = getAttackableGroupsByMode(groups, projectile.targetMode)
        .filter((group) => !hitKeys.has(group.key));
      for (const candidate of splashCandidates) {
        const dist = distanceBetweenPoints(
          activePrimary.position.x,
          activePrimary.position.y,
          candidate.position.x,
          candidate.position.y
        );
        if (dist > projectile.splashRadius) continue;

        const falloff = clamp(1 - dist / projectile.splashRadius, 0.25, 1);
        dealt += applyDamageToAttackerGroup(
          candidate,
          damagePerBurstShot * projectile.splashRatio * falloff
        );
      }
    }
  }

  return dealt;
}

function computeGroupShotDamage(
  group: AttackerGroup,
  healthRatio: number,
  attackerVariance: number,
  attackerCrit: boolean
): number {
  const effectiveUnits = Math.max(0.25, group.hp / Math.max(1, group.hpPerUnit));
  const perUnitDamage = Math.max(0, group.baseDamagePerUnit + group.splitDamageBonus);
  let damage = effectiveUnits * perUnitDamage;
  damage *= clamp(0.5 + healthRatio * 0.5, 0.35, 1);
  damage *= attackerVariance;

  if (group.pathMode === "direct") {
    damage *= 1.06;
  }

  if (group.zombieBoostSec > 0) {
    damage *= group.zombieDamageMultiplier;
  }

  if (attackerCrit) {
    damage *= 1.32;
  }

  if (group.explodeCharges > 0) {
    damage *= 1.35;
  }

  return Math.max(0, damage);
}

function computeSupportShieldGain(
  group: AttackerGroup,
  healthRatio: number,
  attackerVariance: number,
  attackerCrit: boolean
): number {
  const effectiveUnits = Math.max(0.25, group.hp / Math.max(1, group.hpPerUnit));
  const supportPower = effectiveUnits * group.supportPowerPerUnit;
  let shield = supportPower * 0.1 * clamp(0.5 + healthRatio * 0.5, 0.3, 1);
  shield *= attackerVariance;
  if (group.zombieBoostSec > 0) {
    shield *= group.zombieHealthMultiplier;
  }
  if (attackerCrit) {
    shield *= 1.12;
  }
  return clamp(shield, 0, 2200);
}

function applyDamageToDefender(unit: DefenderUnit, damage: number): number {
  if (unit.hp <= 0 || damage <= 0) return 0;
  const dealt = Math.min(unit.hp, damage);
  unit.hp -= dealt;
  return dealt;
}

function applyDamageToAttackerGroup(group: AttackerGroup, damage: number): number {
  if (group.hp <= 0 || damage <= 0) return 0;

  const mitigation = group.zombieBoostSec > 0
    ? clamp(1 / group.zombieHealthMultiplier, 0.45, 1)
    : 1;
  const mitigatedDamage = damage * mitigation;

  const hpBefore = group.hp;
  let hpAfter = Math.max(0, hpBefore - mitigatedDamage);
  const rawLostUnits = Math.max(
    0,
    Math.floor((hpBefore - hpAfter) / Math.max(1, group.hpPerUnit))
  );

  if (rawLostUnits > 0 && group.splitFactor > 0) {
    const spawnedUnits = rawLostUnits * group.splitFactor;
    const splitHpGain = spawnedUnits * group.hpPerUnit * group.splitHpRatio;
    const boundedGain = Math.min(splitHpGain, mitigatedDamage * 0.6);
    hpAfter = Math.min(hpBefore, hpAfter + boundedGain);

    const splitDamageGain = spawnedUnits * group.baseDamagePerUnit * group.splitDamageRatio;
    group.splitDamageBonus = Math.min(
      group.baseDamagePerUnit * 0.7,
      group.splitDamageBonus + splitDamageGain
    );
  }

  group.hp = hpAfter;
  group.unitCount = Math.max(0, Math.ceil(group.hp / Math.max(1, group.hpPerUnit)));
  return hpBefore - hpAfter;
}

function consumeExplosiveCharge(group: AttackerGroup): void {
  if (group.explodeCharges <= 0 || group.hp <= 0) return;

  group.explodeCharges -= 1;
  const selfCost = Math.min(group.hp, group.hpPerUnit * 0.78);
  group.hp = Math.max(0, group.hp - selfCost);
  group.unitCount = Math.max(0, Math.ceil(group.hp / Math.max(1, group.hpPerUnit)));
}

function selectDefenderTarget(
  units: DefenderUnit[],
  group: AttackerGroup,
  wallPressure: number,
  allUnits: DefenderUnit[]
): DefenderUnit | null {
  for (const pool of group.targetPriority) {
    const candidates = units.filter((candidate) => candidate.pool === pool && candidate.hp > 0);
    if (candidates.length === 0) continue;

    let best: DefenderUnit | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const pathDistance = computePathDistance(group, candidate, wallPressure, allUnits);
      const hpRatio = clamp(candidate.hp / Math.max(1, candidate.maxHp), 0, 1);
      const score = pathDistance + hpRatio * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best) return best;
  }

  let fallback: DefenderUnit | null = null;
  let fallbackDistance = Number.POSITIVE_INFINITY;
  for (const candidate of units) {
    if (candidate.hp <= 0) continue;
    const dist = distanceBetweenPoints(
      group.position.x,
      group.position.y,
      candidate.x,
      candidate.y
    );
    if (dist < fallbackDistance) {
      fallbackDistance = dist;
      fallback = candidate;
    }
  }

  return fallback;
}

function selectDefenderFallback(
  units: DefenderUnit[],
  priority: CombatPool[],
  rng: () => number
): DefenderUnit | null {
  for (const pool of priority) {
    const candidates = units.filter((candidate) => candidate.pool === pool && candidate.hp > 0);
    if (candidates.length > 0) {
      const idx = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
      return candidates[idx] ?? null;
    }
  }

  const alive = units.filter((candidate) => candidate.hp > 0);
  if (alive.length === 0) return null;
  const idx = Math.min(alive.length - 1, Math.floor(rng() * alive.length));
  return alive[idx] ?? null;
}

function selectAttackerTarget(groups: AttackerGroup[], unit: DefenderUnit): AttackerGroup | null {
  let best: AttackerGroup | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const group of groups) {
    if (group.hp <= 0) continue;
    if (!canTargetModeHitGroup(unit.targetMode, group)) continue;

    const dist = distanceBetweenPoints(unit.x, unit.y, group.position.x, group.position.y);
    const threat = (group.baseDamagePerUnit + group.splitDamageBonus) * Math.max(0.25, group.unitCount);
    const score = dist - threat * 0.0008;

    if (score < bestScore) {
      bestScore = score;
      best = group;
    }
  }

  return best;
}

function moveGroupTowards(
  group: AttackerGroup,
  target: DefenderUnit,
  tickSeconds: number,
  wallPressure: number,
  units: DefenderUnit[]
): void {
  const directDistance = distanceBetweenPoints(
    group.position.x,
    group.position.y,
    target.x,
    target.y
  );
  if (directDistance <= 0.001) return;

  const baseSpeed = group.speedTilesPerSec * (group.zombieBoostSec > 0 ? group.zombieSpeedMultiplier : 1);
  const wallBarrierPenalty = computeWallBarrierPenalty(group, target, units);
  const pathPenalty = group.pathMode === "direct"
    ? 1
    : clamp(1 - Math.min(0.52, wallPressure * 0.02 + wallBarrierPenalty * 0.08), 0.48, 1);
  const step = Math.max(0, baseSpeed * pathPenalty * tickSeconds);
  if (step <= 0) return;

  const nextX = moveScalar(group.position.x, target.x, step / directDistance);
  const nextY = moveScalar(group.position.y, target.y, step / directDistance);

  group.position.x = clamp(nextX, 0, YARD_WIDTH);
  group.position.y = clamp(nextY, 0, YARD_HEIGHT);
}

function computePathDistance(
  group: AttackerGroup,
  target: DefenderUnit,
  wallPressure: number,
  units: DefenderUnit[]
): number {
  const straight = distanceBetweenPoints(
    group.position.x,
    group.position.y,
    target.x,
    target.y
  );

  if (group.pathMode === "direct") {
    return straight * 0.78;
  }

  if (target.pool === "wall") {
    return straight;
  }

  const wallBarrierPenalty = computeWallBarrierPenalty(group, target, units);
  return straight + Math.min(6.2, wallPressure * 0.36 + wallBarrierPenalty);
}

function computeProjectileTravelSeconds(distance: number, speedTilesPerSec: number): number {
  if (!Number.isFinite(speedTilesPerSec) || speedTilesPerSec <= 0) {
    return 0;
  }
  return Math.max(0, distance / speedTilesPerSec);
}

function findDefenderById(units: DefenderUnit[], id: string): DefenderUnit | null {
  for (const unit of units) {
    if (unit.id === id && unit.hp > 0) return unit;
  }
  return null;
}

function findAttackerByKey(
  groups: AttackerGroup[],
  key: string,
  targetMode: TowerTargetMode = "mixed"
): AttackerGroup | null {
  for (const group of groups) {
    if (!canTargetModeHitGroup(targetMode, group)) continue;
    if (group.key === key && group.hp > 0) return group;
  }
  return null;
}

function findStrongestAttacker(
  groups: AttackerGroup[],
  targetMode: TowerTargetMode = "mixed"
): AttackerGroup | null {
  let best: AttackerGroup | null = null;
  let bestHp = 0;
  for (const group of groups) {
    if (!canTargetModeHitGroup(targetMode, group)) continue;
    if (group.hp <= 0) continue;
    if (group.hp > bestHp) {
      bestHp = group.hp;
      best = group;
    }
  }
  return best;
}

function getAttackableGroupsByMode(
  groups: AttackerGroup[],
  targetMode: TowerTargetMode
): AttackerGroup[] {
  return groups.filter((group) => group.hp > 0 && canTargetModeHitGroup(targetMode, group));
}

function canTargetModeHitGroup(targetMode: TowerTargetMode, group: AttackerGroup): boolean {
  if (targetMode === "air") return group.isFlyer;
  if (targetMode === "ground") return !group.isFlyer;
  return true;
}

function selectNearestAttackerTargets(
  groups: AttackerGroup[],
  targetMode: TowerTargetMode,
  around: Point2,
  exclude: Set<string>,
  count: number
): AttackerGroup[] {
  if (count <= 0) return [];

  const candidates = getAttackableGroupsByMode(groups, targetMode)
    .filter((group) => !exclude.has(group.key));
  candidates.sort((left, right) => {
    const leftDist = distanceBetweenPoints(around.x, around.y, left.position.x, left.position.y);
    const rightDist = distanceBetweenPoints(around.x, around.y, right.position.x, right.position.y);
    return leftDist - rightDist;
  });
  return candidates.slice(0, count);
}

function selectPierceAttackerTargets(
  groups: AttackerGroup[],
  targetMode: TowerTargetMode,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  exclude: Set<string>,
  count: number
): AttackerGroup[] {
  if (count <= 0) return [];

  const withMetrics: Array<{ group: AttackerGroup; dist: number; t: number }> = [];
  for (const group of getAttackableGroupsByMode(groups, targetMode)) {
    if (exclude.has(group.key)) continue;
    const metrics = pointToSegmentMetrics(
      group.position.x,
      group.position.y,
      sourceX,
      sourceY,
      targetX,
      targetY
    );
    if (metrics.t <= 0.05 || metrics.t >= 1.1) continue;
    if (metrics.distance > 1.1) continue;
    withMetrics.push({
      group,
      dist: metrics.distance,
      t: metrics.t,
    });
  }

  withMetrics.sort((left, right) => {
    if (Math.abs(left.t - right.t) > 0.001) return left.t - right.t;
    return left.dist - right.dist;
  });
  return withMetrics.slice(0, count).map((entry) => entry.group);
}

function computeWallPressure(units: DefenderUnit[]): number {
  let pressure = 0;
  for (const unit of units) {
    if (unit.pool !== "wall" || unit.hp <= 0) continue;

    const hpRatio = clamp(unit.hp / Math.max(1, unit.maxHp), 0.15, 1);
    const fortificationBoost = 1 + unit.fortification * 0.18;
    pressure += hpRatio * fortificationBoost;
  }
  return pressure;
}

function computeWallBarrierPenalty(
  group: AttackerGroup,
  target: DefenderUnit,
  units: DefenderUnit[]
): number {
  if (group.pathMode === "direct") return 0;

  let penalty = 0;
  for (const wall of units) {
    if (wall.pool !== "wall" || wall.hp <= 0) continue;

    const metrics = pointToSegmentMetrics(
      wall.x,
      wall.y,
      group.position.x,
      group.position.y,
      target.x,
      target.y
    );
    if (metrics.t <= 0.05 || metrics.t >= 0.95) continue;
    if (metrics.distance > 0.9) continue;

    const hpRatio = clamp(wall.hp / Math.max(1, wall.maxHp), 0.15, 1);
    const fortificationBoost = 1 + wall.fortification * 0.18;
    penalty += hpRatio * fortificationBoost;
  }

  return penalty;
}

function pointToSegmentMetrics(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { distance: number; t: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 0.000001) {
    return {
      distance: distanceBetweenPoints(px, py, ax, ay),
      t: 0,
    };
  }

  const apx = px - ax;
  const apy = py - ay;
  const rawT = (apx * abx + apy * aby) / abLenSq;
  const t = clamp(rawT, 0, 1);
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return {
    distance: distanceBetweenPoints(px, py, closestX, closestY),
    t: rawT,
  };
}

function sumGroupHp(groups: AttackerGroup[]): number {
  let total = 0;
  for (const group of groups) {
    if (group.hp <= 0) continue;
    total += group.hp;
  }
  return Math.max(0, total);
}

function calculateDefenderDps(units: DefenderUnit[]): number {
  let total = 0;
  for (const unit of units) {
    if (unit.hp <= 0 || unit.baseDps <= 0 || unit.maxHp <= 0) continue;
    const healthRatio = clamp(unit.hp / unit.maxHp, 0.25, 1);
    total += unit.baseDps * healthRatio;
  }
  return Math.max(0, total);
}

function sumUnitHp(units: DefenderUnit[]): number {
  let total = 0;
  for (const unit of units) {
    if (unit.hp <= 0) continue;
    total += unit.hp;
  }
  return Math.max(0, total);
}

function isPoolDestroyed(units: DefenderUnit[], pool: CombatPool): boolean {
  let found = false;
  for (const unit of units) {
    if (unit.pool !== pool) continue;
    found = true;
    if (unit.hp > 0) return false;
  }
  return found;
}

function computeDestroyedRatio(summary: CombatSimulationSummary): number {
  const startHp = Math.max(1, summary.defenderHpMax);
  const remaining = clamp(summary.defenderHpRemaining, 0, startHp);
  return 1 - remaining / startHp;
}

type LegacyStorageLootSource = {
  destroyedRatio: number;
  pct: number;
  cap: number;
  priority: number;
};

function deriveLegacyStorageLoot(
  defenderSave: Save,
  resources: ResourceSummary,
  initialUnits: DefenderUnit[],
  finalUnits: DefenderUnit[]
): ResourceSummary {
  const finalById = new Map<string, DefenderUnit>();
  for (const unit of finalUnits) {
    finalById.set(unit.id, unit);
  }

  const isOutpostLike = isOutpostLikeCombatBaseType(String(defenderSave.type ?? ""));
  const lootSources: LegacyStorageLootSource[] = [];

  for (const unit of initialUnits) {
    if (unit.code !== 6 && unit.code !== 14 && unit.code !== 112) continue;

    const finalUnit = finalById.get(unit.id);
    const finalHp = finalUnit ? finalUnit.hp : 0;
    // Legacy BSTORAGE.Destroyed only triggers storage loot when the building is actually down.
    if (finalHp > 0) continue;

    lootSources.push({
      destroyedRatio: 1,
      pct: resolveStorageLootPercent(unit.code),
      cap: resolveStorageLootCap(unit.code, isOutpostLike),
      priority: resolveStorageLootPriority(unit.code),
    });
  }

  if (lootSources.length === 0) return emptyResourceSummary();

  lootSources.sort((left, right) => left.priority - right.priority);

  const remaining = normalizeResourceSummary(resources);
  const loot = emptyResourceSummary();
  for (const source of lootSources) {
    for (const key of ["r1", "r2", "r3", "r4"] as const) {
      let amount = Math.trunc(remaining[key] * source.pct * source.destroyedRatio);
      amount = Math.min(amount, source.cap);
      if (key === "r4") {
        amount = Math.ceil(amount * STORAGE_LOOT_GOO_LIMITER);
      }

      const taken = Math.max(0, Math.min(remaining[key], amount));
      if (taken <= 0) continue;

      remaining[key] = Math.max(0, remaining[key] - taken);
      loot[key] = Math.max(0, loot[key] + taken);
    }
  }

  return loot;
}

function computeStorageDamageRatio(
  initialUnits: DefenderUnit[],
  finalUnits: DefenderUnit[]
): number {
  const finalById = new Map<string, DefenderUnit>();
  for (const unit of finalUnits) {
    finalById.set(unit.id, unit);
  }

  let totalMaxHp = 0;
  let totalDamage = 0;
  for (const unit of initialUnits) {
    if (unit.code !== 6 && unit.code !== 14 && unit.code !== 112) continue;
    if (unit.maxHp <= 0) continue;

    const finalUnit = finalById.get(unit.id);
    const finalHp = clamp(finalUnit?.hp ?? 0, 0, unit.maxHp);
    totalMaxHp += unit.maxHp;
    totalDamage += Math.max(0, unit.maxHp - finalHp);
  }

  if (totalMaxHp <= 0) return 0;
  return clamp(totalDamage / totalMaxHp, 0, 1);
}

function resolveStorageLootPercent(typeCode: number): number {
  if (typeCode === 14) return STORAGE_LOOT_PCT_TH;
  if (typeCode === 112) return STORAGE_LOOT_PCT_OUTPOST;
  return STORAGE_LOOT_PCT_BASE;
}

function resolveStorageLootCap(typeCode: number, isOutpostLike: boolean): number {
  if (typeCode === 14) {
    return isOutpostLike ? STORAGE_LOOT_MAX_WM_TH : STORAGE_LOOT_MAX_TH;
  }
  if (typeCode === 6) {
    return isOutpostLike ? STORAGE_LOOT_MAX_WM_SILO : STORAGE_LOOT_MAX_SILO;
  }
  if (typeCode === 112) {
    return STORAGE_LOOT_MAX_OUTPOST;
  }
  return STORAGE_LOOT_MAX_TH;
}

function resolveStorageLootPriority(typeCode: number): number {
  if (typeCode === 14) return 0;
  if (typeCode === 112) return 1;
  if (typeCode === 6) return 2;
  return 3;
}

function isOutpostLikeCombatBaseType(baseType: string): boolean {
  return baseType === BaseType.OUTPOST || baseType === BaseType.INFERNO_TRIBE;
}

function normalizeResourceSummary(input: ResourceSummary): ResourceSummary {
  return {
    r1: Math.max(0, Math.trunc(input.r1)),
    r2: Math.max(0, Math.trunc(input.r2)),
    r3: Math.max(0, Math.trunc(input.r3)),
    r4: Math.max(0, Math.trunc(input.r4)),
  };
}

function emptyResourceSummary(): ResourceSummary {
  return {
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0,
  };
}

function sumResourceSummary(resources: ResourceSummary): number {
  return resources.r1 + resources.r2 + resources.r3 + resources.r4;
}

function scaleResourceSummary(resources: ResourceSummary, factor: number): ResourceSummary {
  const clampedFactor = clamp(factor, 0, 1);
  return {
    r1: Math.max(0, Math.trunc(resources.r1 * clampedFactor)),
    r2: Math.max(0, Math.trunc(resources.r2 * clampedFactor)),
    r3: Math.max(0, Math.trunc(resources.r3 * clampedFactor)),
    r4: Math.max(0, Math.trunc(resources.r4 * clampedFactor)),
  };
}

function mergeLootWithResourceCap(
  maxResources: ResourceSummary,
  ...lootBags: ResourceSummary[]
): ResourceSummary {
  const merged = emptyResourceSummary();
  for (const bag of lootBags) {
    merged.r1 += bag.r1;
    merged.r2 += bag.r2;
    merged.r3 += bag.r3;
    merged.r4 += bag.r4;
  }

  return {
    r1: Math.max(0, Math.min(maxResources.r1, merged.r1)),
    r2: Math.max(0, Math.min(maxResources.r2, merged.r2)),
    r3: Math.max(0, Math.min(maxResources.r3, merged.r3)),
    r4: Math.max(0, Math.min(maxResources.r4, merged.r4)),
  };
}

function scaleLootByTargetType(loot: ResourceSummary, targetType: TargetType): ResourceSummary {
  if (targetType !== "wild") return loot;
  return {
    r1: Math.max(0, Math.trunc(loot.r1 * 0.2)),
    r2: Math.max(0, Math.trunc(loot.r2 * 0.2)),
    r3: Math.max(0, Math.trunc(loot.r3 * 0.2)),
    r4: Math.max(0, Math.trunc(loot.r4 * 0.2)),
  };
}

function pickLeveledStat(values: number[] | undefined, level: number, fallback: number): number {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const idx = Math.min(Math.max(level - 1, 0), values.length - 1);
  const raw = values[idx];
  return Number.isFinite(raw) ? raw : fallback;
}

function deriveMonsterRangeTiles(rangeValues: number[] | undefined, level: number): number {
  const rawRange = pickLeveledStat(rangeValues, level, 0);
  if (rawRange <= 0) return 1.4;
  return Math.max(1.6, rawRange / 42);
}

function deriveMonsterSpeedTilesPerSec(speedValues: number[] | undefined, level: number): number {
  const rawSpeed = pickLeveledStat(speedValues, level, 1.3);
  return clamp(rawSpeed, 0.4, 6);
}

function deriveMonsterProjectileSpeedTilesPerSec(
  rangeValues: number[] | undefined,
  attackDelayValues: number[] | undefined,
  level: number,
  rangeTiles: number
): number {
  const rawRange = pickLeveledStat(rangeValues, level, 0);
  if (rawRange <= 0) {
    return 999;
  }

  const delayFrames = Math.max(0, pickLeveledStat(attackDelayValues, level, 0));
  if (delayFrames <= 0) {
    return Math.max(4, rangeTiles / 0.3);
  }

  const delaySec = Math.max(0.12, delayFrames / 30);
  return Math.max(3, rangeTiles / delaySec);
}

function resolvePathMode(pathing: unknown, movement: unknown): PathMode {
  const pathingToken = normalizeTextToken(pathing);
  const movementToken = normalizeTextToken(movement);
  if (pathingToken === "direct" || movementToken === "burrow") {
    return "direct";
  }
  return "ground";
}

function normalizeTextToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function sampleSpawnPosition(index: number, rng: () => number): Point2 {
  const side = (index + Math.floor(rng() * 4)) % 4;
  const jitter = (rng() - 0.5) * 0.7;

  switch (side) {
    case 0:
      return { x: clamp(rng() * YARD_WIDTH, 0, YARD_WIDTH), y: clamp(0.2 + jitter, 0, YARD_HEIGHT) };
    case 1:
      return { x: clamp(YARD_WIDTH - 0.2 + jitter, 0, YARD_WIDTH), y: clamp(rng() * YARD_HEIGHT, 0, YARD_HEIGHT) };
    case 2:
      return { x: clamp(rng() * YARD_WIDTH, 0, YARD_WIDTH), y: clamp(YARD_HEIGHT - 0.2 + jitter, 0, YARD_HEIGHT) };
    default:
      return { x: clamp(0.2 + jitter, 0, YARD_WIDTH), y: clamp(rng() * YARD_HEIGHT, 0, YARD_HEIGHT) };
  }
}

function resolveAttackerTargetPriority(groupId: number, supportGroup: boolean): CombatPool[] {
  if (supportGroup) {
    return ["defense", "hq", "resource", "storage", "utility", "wall", "other"];
  }

  switch (groupId) {
    case 2:
      return ["hq", "defense", "resource", "storage", "utility", "wall", "other"];
    case 3:
      return ["resource", "storage", "hq", "utility", "defense", "wall", "other"];
    case 4:
      return ["defense", "hq", "resource", "storage", "utility", "wall", "other"];
    case 5:
      return ["defense", "resource", "hq", "storage", "utility", "wall", "other"];
    case 6:
      return ["hq", "defense", "wall", "resource", "storage", "utility", "other"];
    default:
      return ["defense", "resource", "storage", "hq", "utility", "wall", "other"];
  }
}

function deriveSiegeWeaponDps(save: Save): number {
  const catapult = Math.max(0, parseIntSafe(save.catapult, 0));
  const flinger = Math.max(0, parseIntSafe(save.flinger, 0));
  const catapultDps = catapult > 0 ? 22 + catapult * 18 : 0;
  const flingerDps = flinger > 0 ? 16 + flinger * 14 : 0;
  return catapultDps + flingerDps;
}

function distanceBetweenPoints(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function moveScalar(current: number, target: number, stepRatio: number): number {
  return current + (target - current) * clamp(stepRatio, 0, 1);
}

function buildDeterministicSeed(userId: number, replayId: string, targetBaseId: string): number {
  const raw = `${userId}:${replayId}:${targetBaseId}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const seedHex = hash.slice(0, 8);
  const parsed = Number.parseInt(seedHex, 16);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function createDeterministicRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
