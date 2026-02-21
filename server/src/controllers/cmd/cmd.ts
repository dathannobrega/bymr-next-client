import { createHash, randomUUID } from "node:crypto";

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../models/user.model.js";
import { Save } from "../../models/save.model.js";
import { postgres, redis } from "../../server.js";
import { Status } from "../../enums/StatusCodes.js";
import { logger } from "../../utils/logger.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import {
  CancelAcademyUpgradeArgsSchema,
  CancelUpgradeArgsSchema,
  CmdEnvelopeSchema,
  CmdOperationSchema,
  CmdSuccessResponseSchema,
  CollectHarvesterArgsSchema,
  FinishAcademyUpgradeNowArgsSchema,
  ApplyYardPlannerTemplateArgsSchema,
  MoveBuildingArgsSchema,
  PlaceBuildingArgsSchema,
  PurchaseStoreItemArgsSchema,
  StartRepairAllBuildingsArgsSchema,
  StartRepairBuildingArgsSchema,
  StartAcademyUpgradeArgsSchema,
  UpgradeBuildingArgsSchema,
  type ApplyYardPlannerTemplateArgs,
  type CancelAcademyUpgradeArgs,
  type CancelUpgradeArgs,
  type CmdOperation,
  type CollectHarvesterArgs,
  type FinishAcademyUpgradeNowArgs,
  type MoveBuildingArgs,
  type PlaceBuildingArgs,
  type PurchaseStoreItemArgs,
  type StartRepairAllBuildingsArgs,
  type StartRepairBuildingArgs,
  type StartAcademyUpgradeArgs,
  type CmdSuccessResponse,
  type UpgradeBuildingArgs,
} from "../../zod/CmdSchema.js";
import {
  coerceBuildingTypeFromRecord,
  normalizeBuildingTypeInput,
} from "../../utils/buildingType.js";
import {
  type BuildingFootprint,
  footprintsOverlap,
  getLegacyFootprintTilesByCode,
  isFootprintWithinBounds,
} from "../../utils/buildingFootprint.js";
import { publishStateStreamDelta } from "../../services/stream/stateStreamBus.js";
import { storeItems } from "../../data/store/storeItems.js";
import { purchaseKeys } from "../../data/store/purchaseKeys.js";
import {
  legacyMainYardBuildingRules,
  type LegacyBuildCost,
  type LegacyBuildRequirement,
  type LegacyMainYardRule,
} from "../../data/buildings/legacyMainYardRules.js";
import { applyLegacyBuildingProgress } from "../../services/state/applyLegacyBuildingProgress.js";
import { applyLegacyRuleDerivedStats } from "../../services/state/legacyBuildingRuleEffects.js";
import { monsterStats } from "../../data/monsterStats.js";
import {
  applyLegacyAcademyProgress,
  buildAcademyStateSummary,
  ensureAcademyData,
  normalizeAcademyMonsterId,
} from "../../services/state/academyState.js";

type BuildingDataRecord = Record<string, unknown>;

type ParsedBuilding = {
  key: string;
  id: string;
  x: number;
  y: number;
  level: number;
  footprint: BuildingFootprint;
  type: string;
  raw: BuildingDataRecord;
};

type CmdDelta = Record<string, unknown>;

const YARD_WIDTH = 20;
const YARD_HEIGHT = 14;
const MAX_BUILDING_LEVEL = 10;
const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;
const SEQ_TTL_SECONDS = 60 * 60 * 12;
const NONCE_TTL_SECONDS = 60;
const TOWN_HALL_CODE = 14;
const ACADEMY_CODE = 26;
const BASE_WORKER_COUNT = 1;
const EXTRA_WORKER_STORE_ITEM = "BEW";
const ACADEMY_RESOURCE_KEY: ResourceKey = "r3";

type MissingLegacyRequirement = {
  typeCode: number;
  count: number;
  minLevel: number;
  found: number;
};

const RATE_LIMITS: Record<CmdOperation, { max: number; windowSec: number }> = {
  PlaceBuilding: { max: 25, windowSec: 10 },
  MoveBuilding: { max: 40, windowSec: 10 },
  UpgradeBuilding: { max: 20, windowSec: 30 },
  CancelUpgrade: { max: 20, windowSec: 30 },
  CollectHarvester: { max: 60, windowSec: 10 },
  PurchaseStoreItem: { max: 40, windowSec: 10 },
  ApplyYardPlannerTemplate: { max: 20, windowSec: 30 },
  StartRepairBuilding: { max: 40, windowSec: 30 },
  StartRepairAllBuildings: { max: 20, windowSec: 30 },
  StartAcademyUpgrade: { max: 20, windowSec: 30 },
  CancelAcademyUpgrade: { max: 20, windowSec: 30 },
  FinishAcademyUpgradeNow: { max: 20, windowSec: 30 },
};

export const cmd: KoaController = async (ctx) => {
  const startedAtMs = Date.now();
  const traceId = randomUUID();
  const user: User = ctx.authUser;

  await postgres.em.populate(user, ["save"]);
  const save = user.save ?? (await Save.createMainSave(postgres.em, user));

  const envelopeResult = CmdEnvelopeSchema.safeParse(ctx.request.body);
  if (!envelopeResult.success) {
    respondCmdError(ctx, {
      status: Status.BAD_REQUEST,
      error: "Invalid command envelope",
      code: "INVALID_ENVELOPE",
      traceId,
      op: "unknown",
      userId: user.userid,
      ip: ctx.ip,
      startedAtMs,
      rejectedReason: envelopeResult.error.issues.map((issue) => issue.message).join("; "),
    });
    return;
  }

  const envelope = envelopeResult.data;
  const op = envelope.op;
  const payloadHash = hashPayload(envelope.args);

  const idempotencyKey = buildIdempotencyKey(user.userid, envelope.idempotencyKey);
  const cachedResultRaw = await redis.get(idempotencyKey);
  if (cachedResultRaw) {
    const cachedParsed = safeParseJson(cachedResultRaw);
    const cached = CmdSuccessResponseSchema.safeParse(cachedParsed);
    if (cached.success) {
      logCmdTelemetry({
        userId: user.userid,
        ip: ctx.ip,
        op,
        result: "idempotent-hit",
        traceId,
        latencyMs: Date.now() - startedAtMs,
        payloadHash,
      });
      ctx.status = Status.OK;
      ctx.body = cached.data;
      return;
    }
  }

  if (envelope.nonce) {
    const nonceKey = buildNonceKey(user.userid, envelope.nonce);
    const nonceAlreadySeen = await redis.get(nonceKey);
    if (nonceAlreadySeen) {
      respondCmdError(ctx, {
        status: Status.CONFLICT,
        error: "Replay blocked",
        code: "ANTI_REPLAY",
        traceId,
        op,
        userId: user.userid,
        ip: ctx.ip,
        startedAtMs,
        rejectedReason: "nonce-replay",
        payloadHash,
      });
      return;
    }

    await redis.setex(nonceKey, NONCE_TTL_SECONDS, "1");
  }

  const underRateLimit = await checkRateLimit(user.userid, op);
  if (!underRateLimit) {
    respondCmdError(ctx, {
      status: Status.TOO_MANY_REQUESTS,
      error: "Rate limit exceeded for operation",
      code: "RATE_LIMIT",
      traceId,
      op,
      userId: user.userid,
      ip: ctx.ip,
      startedAtMs,
      rejectedReason: "rate-limit",
      payloadHash,
    });
    return;
  }

  const seqKey = buildSeqKey(user.userid);
  const lastSeqRaw = await redis.get(seqKey);
  const lastSeq = parseIntSafe(lastSeqRaw, 0);

  if (envelope.seq <= lastSeq) {
    respondCmdError(ctx, {
      status: Status.CONFLICT,
      error: "Sequence must be monotonic",
      code: "SEQ_OUT_OF_ORDER",
      traceId,
      op,
      userId: user.userid,
      ip: ctx.ip,
      startedAtMs,
      rejectedReason: `seq:${envelope.seq}<=${lastSeq}`,
      payloadHash,
    });
    return;
  }

  const argsResult = parseOperationArgs(op, envelope.args);

  if (argsResult.success === false) {
    respondCmdError(ctx, {
      status: Status.BAD_REQUEST,
      error: "Invalid command args",
      code: "INVALID_ARGS",
      traceId,
      op,
      userId: user.userid,
      ip: ctx.ip,
      startedAtMs,
      rejectedReason: argsResult.errors,
      payloadHash,
    });
    return;
  }

  try {
    applyLegacyBuildingProgress(save);
    const academyProgress = applyLegacyAcademyProgress(save);

    let delta: CmdDelta[] = [];

    switch (argsResult.data.op) {
      case "PlaceBuilding":
        delta = handlePlaceBuilding(save, argsResult.data.args);
        break;

      case "MoveBuilding":
        delta = handleMoveBuilding(save, argsResult.data.args);
        break;

      case "UpgradeBuilding":
        delta = handleUpgradeBuilding(save, argsResult.data.args);
        break;

      case "CancelUpgrade":
        delta = handleCancelUpgrade(save, argsResult.data.args);
        break;

      case "CollectHarvester":
        delta = handleCollectHarvester(save, argsResult.data.args);
        break;

      case "PurchaseStoreItem":
        delta = handlePurchaseStoreItem(user, save, argsResult.data.args);
        break;

      case "ApplyYardPlannerTemplate":
        delta = handleApplyYardPlannerTemplate(save, argsResult.data.args);
        break;

      case "StartRepairBuilding":
        delta = handleStartRepairBuilding(save, argsResult.data.args);
        break;

      case "StartRepairAllBuildings":
        delta = handleStartRepairAllBuildings(save, argsResult.data.args);
        break;

      case "StartAcademyUpgrade":
        delta = handleStartAcademyUpgrade(save, argsResult.data.args);
        break;

      case "CancelAcademyUpgrade":
        delta = handleCancelAcademyUpgrade(save, argsResult.data.args);
        break;

      case "FinishAcademyUpgradeNow":
        delta = handleFinishAcademyUpgradeNow(user, save, argsResult.data.args);
        break;
    }

    if (
      academyProgress.changed &&
      !delta.some((item) => item.op === "setAcademyState")
    ) {
      delta = [
        ...delta,
        {
          op: "setAcademyState",
          academy: buildAcademyStateSummary(save),
        },
      ];
    }

    const serverTime = getCurrentDateTime();
    save.id = save.savetime;
    save.savetime = serverTime;
    await postgres.em.persistAndFlush(save);

    const response: CmdSuccessResponse = CmdSuccessResponseSchema.parse({
      ok: true,
      seq: envelope.seq,
      serverTime,
      delta,
    });

    await redis.setex(seqKey, SEQ_TTL_SECONDS, String(envelope.seq));
    await redis.setex(idempotencyKey, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(response));

    publishStateStreamDelta({
      userId: user.userid,
      baseId: String(save.baseid),
      seq: envelope.seq,
      serverTime,
      op,
      delta,
    });

    logCmdTelemetry({
      userId: user.userid,
      ip: ctx.ip,
      op,
      result: "ok",
      traceId,
      latencyMs: Date.now() - startedAtMs,
      payloadHash,
    });

    ctx.status = Status.OK;
    ctx.body = response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Command failed";
    const errorCode = (error as { code?: string })?.code ?? "CMD_REJECTED";

    respondCmdError(ctx, {
      status: Status.CONFLICT,
      error: errorMessage,
      code: errorCode,
      traceId,
      op,
      userId: user.userid,
      ip: ctx.ip,
      startedAtMs,
      rejectedReason: errorMessage,
      payloadHash,
    });
  }
};

function handlePlaceBuilding(
  save: Save,
  args: PlaceBuildingArgs
): CmdDelta[] {
  const normalizedType = normalizeBuildingTypeInput(args.buildingType);
  if (!normalizedType) {
    throw cmdRejection("Unsupported building type", "INVALID_BUILDING_TYPE");
  }
  const buildingType = normalizedType.canonicalType;
  const buildingTypeCode = normalizedType.code;
  const legacyRule = getLegacyMainYardRule(buildingTypeCode);
  const buildCost = getLegacyCostForTargetLevel(legacyRule, 1);
  if (!buildCost) {
    throw cmdRejection("Building level is not supported by legacy rules", "LEVEL_CAP_EXCEEDED");
  }
  const placementFootprint = getLegacyFootprintTilesByCode(buildingTypeCode);

  assertValidPlacement(args.x, args.y, placementFootprint, "INVALID_COORDS");

  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);

  const townHall = findTownHallBuilding(buildings);
  const hasTownHall = Boolean(townHall);
  if (buildingTypeCode === TOWN_HALL_CODE && hasTownHall) {
    throw cmdRejection("Town Hall already exists", "TOWN_HALL_ALREADY_EXISTS");
  }

  if (buildingTypeCode !== TOWN_HALL_CODE && !hasTownHall) {
    throw cmdRejection("Town Hall is required before placing this building", "TOWN_HALL_REQUIRED");
  }

  if (buildingTypeCode !== TOWN_HALL_CODE) {
    const townHallLevel = getTownHallLevel(buildings);
    assertLegacyQuantityLimit(buildings, legacyRule, townHallLevel);
  }

  assertLegacyRequirements(buildings, buildCost.requirements);

  if (isPlacementOccupied(buildings, args.x, args.y, placementFootprint)) {
    throw cmdRejection("Tile already occupied", "TILE_OCCUPIED");
  }

  const resourceDelta = applyLegacyBuildCost(save, buildCost);
  const nextNumericId = getNextBuildingNumericId(buildings);
  const key = String(nextNumericId);
  const level = 1;

  const createdBuilding: BuildingDataRecord = {
    id: nextNumericId,
    t: buildingTypeCode,
    type: buildingType,
    x: args.x,
    y: args.y,
    X: args.x,
    Y: args.y,
    l: level,
    level,
    fw: placementFootprint.width,
    fh: placementFootprint.height,
    footprintW: placementFootprint.width,
    footprintH: placementFootprint.height,
    cmdManaged: 1,
  };
  if (buildingTypeCode >= 1 && buildingTypeCode <= 4) {
    createdBuilding.st = 0;
    createdBuilding.stored = 0;
    createdBuilding.pr = 0;
    createdBuilding.progress = 0;
  }
  applyLegacyRuleDerivedStats(createdBuilding, buildingTypeCode, level, {
    forceFullHp: true,
    clampHarvesterStored: true,
  });
  buildingData[key] = createdBuilding;

  return [
    ...resourceDelta,
    {
      op: "addBuilding",
      id: String(nextNumericId),
      type: buildingType,
      x: args.x,
      y: args.y,
      level,
      footprintW: placementFootprint.width,
      footprintH: placementFootprint.height,
    },
  ];
}

function handleMoveBuilding(
  save: Save,
  args: MoveBuildingArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const targetBuilding = findBuildingById(buildings, args.buildingId);

  if (!targetBuilding) {
    throw cmdRejection("Building not found", "BUILDING_NOT_FOUND");
  }

  if (isBuildingBusy(targetBuilding.raw)) {
    throw cmdRejection("Building is busy and cannot be moved", "BUILDING_BUSY");
  }

  assertValidPlacement(args.toX, args.toY, targetBuilding.footprint, "INVALID_COORDS");

  if (
    isPlacementOccupied(
      buildings,
      args.toX,
      args.toY,
      targetBuilding.footprint,
      targetBuilding.id
    )
  ) {
    throw cmdRejection("Tile already occupied", "TILE_OCCUPIED");
  }

  targetBuilding.raw.x = args.toX;
  targetBuilding.raw.y = args.toY;
  targetBuilding.raw.X = args.toX;
  targetBuilding.raw.Y = args.toY;
  targetBuilding.raw.fw = targetBuilding.footprint.width;
  targetBuilding.raw.fh = targetBuilding.footprint.height;
  targetBuilding.raw.footprintW = targetBuilding.footprint.width;
  targetBuilding.raw.footprintH = targetBuilding.footprint.height;

  return [
    {
      op: "moveBuilding",
      id: targetBuilding.id,
      x: args.toX,
      y: args.toY,
      footprintW: targetBuilding.footprint.width,
      footprintH: targetBuilding.footprint.height,
    },
  ];
}

function handleUpgradeBuilding(
  save: Save,
  args: UpgradeBuildingArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const targetBuilding = findBuildingById(buildings, args.buildingId);

  if (!targetBuilding) {
    throw cmdRejection("Building not found", "BUILDING_NOT_FOUND");
  }

  const targetCode = resolveBuildingTypeCode(targetBuilding.raw, targetBuilding.type);
  if (targetCode === null) {
    throw cmdRejection("Unsupported building type", "INVALID_BUILDING_TYPE");
  }
  const legacyRule = getLegacyMainYardRule(targetCode);
  const busyBuild = parseIntSafe(
    targetBuilding.raw.cB ?? targetBuilding.raw.countdownBuild,
    0
  );
  if (busyBuild > 0) {
    throw cmdRejection("Building is still under construction", "BUILDING_STILL_BUILDING");
  }

  const busyFortify = parseIntSafe(
    targetBuilding.raw.cF ?? targetBuilding.raw.countdownFortify,
    0
  );
  if (busyFortify > 0) {
    throw cmdRejection("Building is still fortifying", "BUILDING_STILL_FORTIFYING");
  }

  const hp = parseIntSafe(targetBuilding.raw.hp, Number.NaN);
  const maxHp = parseIntSafe(targetBuilding.raw.maxHp ?? targetBuilding.raw.maxHealth, Number.NaN);
  if (Number.isFinite(hp) && Number.isFinite(maxHp) && hp < maxHp) {
    throw cmdRejection("Building is damaged and cannot be upgraded", "BUILDING_DAMAGED");
  }

  const currentLevel = targetBuilding.level > 0 ? targetBuilding.level : 1;
  const requestedLevel = args.targetLevel ?? currentLevel + 1;

  if (requestedLevel <= currentLevel) {
    throw cmdRejection("Target level must be greater than current level", "INVALID_LEVEL");
  }

  if (requestedLevel !== currentLevel + 1) {
    throw cmdRejection("Upgrade target must be exactly one level above current", "INVALID_LEVEL_STEP");
  }

  const legacyLevelCap = legacyRule.costs.length;
  const maxLevel = Math.min(MAX_BUILDING_LEVEL, legacyLevelCap);
  if (requestedLevel > maxLevel) {
    throw cmdRejection("Target level exceeds allowed maximum", "LEVEL_CAP_EXCEEDED");
  }
  const upgradeCost = getLegacyCostForTargetLevel(legacyRule, requestedLevel);
  if (!upgradeCost) {
    throw cmdRejection("Target level exceeds allowed maximum", "LEVEL_CAP_EXCEEDED");
  }

  assertLegacyRequirements(buildings, upgradeCost.requirements);

  if (targetCode !== TOWN_HALL_CODE) {
    const townHallLevel = getTownHallLevel(buildings);
    if (townHallLevel <= 0) {
      throw cmdRejection("Town Hall is required before upgrading this building", "TOWN_HALL_REQUIRED");
    }
    if (requestedLevel > townHallLevel) {
      throw cmdRejection("Town Hall level is too low for this upgrade", "TOWN_HALL_LEVEL_REQUIRED");
    }
  }

  const deferSeconds = args.deferSeconds ?? 0;
  if (deferSeconds > 0) {
    const pending = parseIntSafe(targetBuilding.raw.cU ?? targetBuilding.raw.countdownUpgrade, 0);
    if (pending > 0) {
      throw cmdRejection("Upgrade is already running for this building", "UPGRADE_ALREADY_RUNNING");
    }
    assertWorkerAvailable(save, buildings);
    const resourceDelta = applyLegacyBuildCost(save, upgradeCost);
    targetBuilding.raw.cU = deferSeconds;
    targetBuilding.raw.countdownUpgrade = deferSeconds;
    targetBuilding.raw.upgradeToLevel = requestedLevel;
    targetBuilding.raw.upgradeStartedAt = getCurrentDateTime();

    return [
      ...resourceDelta,
      {
        op: "startUpgrade",
        id: targetBuilding.id,
        fromLevel: currentLevel,
        toLevel: requestedLevel,
        remainingSec: deferSeconds,
      },
    ];
  }

  const resourceDelta = applyLegacyBuildCost(save, upgradeCost);
  targetBuilding.raw.cU = 0;
  targetBuilding.raw.countdownUpgrade = 0;
  delete targetBuilding.raw.upgradeToLevel;
  delete targetBuilding.raw.upgradeStartedAt;
  targetBuilding.raw.l = requestedLevel;
  targetBuilding.raw.level = requestedLevel;
  applyLegacyRuleDerivedStats(targetBuilding.raw, targetCode, requestedLevel, {
    forceFullHp: true,
    clampHarvesterStored: true,
  });

  return [
    ...resourceDelta,
    {
      op: "upgradeBuilding",
      id: targetBuilding.id,
      level: requestedLevel,
    },
  ];
}

function handleCancelUpgrade(
  save: Save,
  args: CancelUpgradeArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const targetBuilding = findBuildingById(buildings, args.buildingId);
  if (!targetBuilding) {
    throw cmdRejection("Building not found", "BUILDING_NOT_FOUND");
  }

  const pending = parseIntSafe(targetBuilding.raw.cU ?? targetBuilding.raw.countdownUpgrade, 0);
  if (pending <= 0) {
    throw cmdRejection("Building is not upgrading", "UPGRADE_NOT_RUNNING");
  }

  targetBuilding.raw.cU = 0;
  targetBuilding.raw.countdownUpgrade = 0;
  delete targetBuilding.raw.upgradeToLevel;
  delete targetBuilding.raw.upgradeStartedAt;

  return [
    {
      op: "cancelUpgrade",
      id: targetBuilding.id,
    },
  ];
}

function handleCollectHarvester(
  save: Save,
  args: CollectHarvesterArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const targetBuilding = findBuildingById(buildings, args.buildingId);
  if (!targetBuilding) {
    throw cmdRejection("Building not found", "BUILDING_NOT_FOUND");
  }

  const target = resolveHarvesterTarget(targetBuilding.raw, targetBuilding.type);
  if (!target) {
    throw cmdRejection("Building is not a supported harvester", "HARVESTER_UNSUPPORTED");
  }
  const targetCode = resolveBuildingTypeCode(targetBuilding.raw, targetBuilding.type);
  if (targetCode !== null) {
    applyLegacyRuleDerivedStats(targetBuilding.raw, targetCode, targetBuilding.level, {
      clampHarvesterStored: true,
    });
  }

  if (isBuildingBusy(targetBuilding.raw)) {
    throw cmdRejection("Harvester is busy and cannot be collected", "HARVESTER_BUSY");
  }

  const hp = parseIntSafe(targetBuilding.raw.hp, Number.NaN);
  const maxHp = parseIntSafe(targetBuilding.raw.maxHp ?? targetBuilding.raw.maxHealth, Number.NaN);
  if (Number.isFinite(hp) && Number.isFinite(maxHp) && hp < maxHp) {
    throw cmdRejection("Harvester is damaged and cannot be collected", "HARVESTER_DAMAGED");
  }

  const stored = parseIntSafe(targetBuilding.raw.st ?? targetBuilding.raw.stored, 0);
  if (stored <= 0) {
    throw cmdRejection("Harvester has no resources to collect", "HARVESTER_EMPTY");
  }

  const requestedAmount = args.amount ?? stored;
  const candidateAmount = Math.max(1, Math.min(requestedAmount, stored));

  const bag = ensureResourceBag(save, target.bag);
  const collected = applyResourceGain(bag, target.resourceKey, candidateAmount);
  if (collected <= 0) {
    throw cmdRejection("Resource storage is full", "RESOURCE_STORAGE_FULL");
  }

  const remainingStored = stored - collected;
  targetBuilding.raw.st = remainingStored;
  targetBuilding.raw.stored = remainingStored;
  if (remainingStored <= 0) {
    targetBuilding.raw.pr = 0;
    targetBuilding.raw.progress = 0;
  }

  return [
    {
      op: "collectHarvester",
      id: targetBuilding.id,
      resourceKey: target.resourceKey,
      amount: collected,
      remainingStored,
    },
    {
      op: "setResources",
      bag: target.bag,
      resources: normalizeResourceBag(bag),
    },
  ];
}

function handlePurchaseStoreItem(
  user: User,
  save: Save,
  args: PurchaseStoreItemArgs
): CmdDelta[] {
  const item = args.item.trim().toUpperCase();
  const quantity = Math.max(1, Math.trunc(args.quantity ?? 1));
  const isStoreItem = Object.prototype.hasOwnProperty.call(storeItems, item);
  const isPurchaseKey = purchaseKeys.has(item);
  if (!isStoreItem && !isPurchaseKey) {
    throw cmdRejection("Unknown store item", "STORE_ITEM_UNKNOWN");
  }

  const userSave = user.save ?? save;
  const currentCredits = parseIntSafe(userSave.credits, 0);
  const storeData = ensureStoreData(save);
  const currentEntry = asRecord(storeData[item]);
  const currentQuantity = Math.max(0, parseIntSafe(currentEntry?.q, 0));
  const totalCost = calculateStorePurchaseCost(item, currentQuantity, quantity);
  if (totalCost <= 0) {
    throw cmdRejection("Could not calculate store purchase cost", "STORE_COST_INVALID");
  }

  if (currentCredits < totalCost) {
    throw cmdRejection("Insufficient credits for purchase", "INSUFFICIENT_CREDITS");
  }

  const nextQuantity = currentQuantity + quantity;
  const nextEntry: Record<string, unknown> = { q: nextQuantity };
  const storeItem = storeItems[item];
  if (storeItem && storeItem.du > 0) {
    nextEntry.e = getCurrentDateTime() + storeItem.du;
  }

  storeData[item] = nextEntry;
  save.storedata = storeData;
  userSave.credits = currentCredits - totalCost;

  return [
    {
      op: "storePurchase",
      item,
      quantity,
      totalCost,
      q: nextQuantity,
      ...(nextEntry.e ? { e: nextEntry.e } : {}),
    },
    {
      op: "setStoreItem",
      item,
      q: nextQuantity,
      ...(nextEntry.e ? { e: nextEntry.e } : {}),
    },
    {
      op: "setCredits",
      credits: userSave.credits,
    },
  ];
}

function handleApplyYardPlannerTemplate(
  save: Save,
  args: ApplyYardPlannerTemplateArgs
): CmdDelta[] {
  const templateData = resolveYardPlannerTemplateData(save, args.slotId);
  if (!templateData) {
    throw cmdRejection("Yard planner template not found", "YARD_PLANNER_TEMPLATE_NOT_FOUND");
  }

  const targets = parseYardPlannerTemplateTargets(templateData);
  if (targets.length === 0) {
    throw cmdRejection("Yard planner template has no valid targets", "YARD_PLANNER_TEMPLATE_INVALID");
  }

  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const plannedById = new Map<string, { x: number; y: number }>();

  for (const target of targets) {
    const building = findBuildingById(buildings, target.buildingId);
    if (!building) {
      throw cmdRejection(
        `Template references unknown building id ${target.buildingId}`,
        "YARD_PLANNER_BUILDING_NOT_FOUND"
      );
    }

    if (isBuildingBusy(building.raw)) {
      throw cmdRejection(
        `Building ${building.id} is busy and cannot be moved by yard planner`,
        "YARD_PLANNER_BUILDING_BUSY"
      );
    }

    assertValidPlacement(
      target.x,
      target.y,
      building.footprint,
      "YARD_PLANNER_INVALID_COORDS"
    );
    plannedById.set(building.id, { x: target.x, y: target.y });
  }

  assertProjectedYardPlannerLayout(buildings, plannedById);

  const delta: CmdDelta[] = [];
  for (const building of buildings) {
    const target = plannedById.get(building.id);
    if (!target) continue;
    if (building.x === target.x && building.y === target.y) continue;

    building.raw.x = target.x;
    building.raw.y = target.y;
    building.raw.X = target.x;
    building.raw.Y = target.y;
    building.raw.fw = building.footprint.width;
    building.raw.fh = building.footprint.height;
    building.raw.footprintW = building.footprint.width;
    building.raw.footprintH = building.footprint.height;

    delta.push({
      op: "moveBuilding",
      id: building.id,
      x: target.x,
      y: target.y,
      footprintW: building.footprint.width,
      footprintH: building.footprint.height,
    });
  }

  return delta;
}

function handleStartRepairBuilding(
  save: Save,
  args: StartRepairBuildingArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const targetBuilding = findBuildingById(buildings, args.buildingId);
  if (!targetBuilding) {
    throw cmdRejection("Building not found", "BUILDING_NOT_FOUND");
  }

  if (isBuildingBusy(targetBuilding.raw)) {
    throw cmdRejection("Building is busy and cannot be repaired", "BUILDING_BUSY");
  }

  const targetCode = resolveBuildingTypeCode(targetBuilding.raw, targetBuilding.type);
  if (targetCode !== null) {
    applyLegacyRuleDerivedStats(targetBuilding.raw, targetCode, targetBuilding.level, {
      clampHarvesterStored: true,
    });
  }

  const normalized = normalizeBuildingRepairState(targetBuilding.raw);
  if (!normalized.repairable) {
    throw cmdRejection("Building has no repair state", "BUILDING_REPAIR_UNSUPPORTED");
  }

  if (normalized.hp >= normalized.maxHp) {
    throw cmdRejection("Building is not damaged", "BUILDING_NOT_DAMAGED");
  }

  setBuildingRepairing(targetBuilding.raw, true);
  return [
    {
      op: "setBuildingRepairState",
      id: targetBuilding.id,
      hp: normalized.hp,
      maxHp: normalized.maxHp,
      repairing: true,
    },
  ];
}

function handleStartRepairAllBuildings(
  save: Save,
  _args: StartRepairAllBuildingsArgs
): CmdDelta[] {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const delta: CmdDelta[] = [];

  for (const building of buildings) {
    if (isBuildingBusy(building.raw)) continue;

    const typeCode = resolveBuildingTypeCode(building.raw, building.type);
    if (typeCode !== null) {
      applyLegacyRuleDerivedStats(building.raw, typeCode, building.level, {
        clampHarvesterStored: true,
      });
    }

    const normalized = normalizeBuildingRepairState(building.raw);
    if (!normalized.repairable) continue;
    if (normalized.hp >= normalized.maxHp) continue;

    setBuildingRepairing(building.raw, true);
    delta.push({
      op: "setBuildingRepairState",
      id: building.id,
      hp: normalized.hp,
      maxHp: normalized.maxHp,
      repairing: true,
    });
  }

  return delta;
}

function handleStartAcademyUpgrade(
  save: Save,
  args: StartAcademyUpgradeArgs
): CmdDelta[] {
  const monsterId = normalizeAcademyMonsterId(args.monsterId);
  if (!monsterId) {
    throw cmdRejection("Monster is not supported by academy", "ACADEMY_MONSTER_UNSUPPORTED");
  }

  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const academyBuilding = findAcademyBuilding(buildings);
  if (!academyBuilding) {
    throw cmdRejection("Academy building not found", "ACADEMY_NOT_FOUND");
  }

  if (isBuildingBusy(academyBuilding.raw)) {
    throw cmdRejection("Academy building is busy", "ACADEMY_BUSY");
  }

  const academyState = buildAcademyStateSummary(save);
  if (academyState.activeMonsterId) {
    throw cmdRejection("Academy already has active training", "ACADEMY_BUSY");
  }

  const lockerData = asRecord(save.lockerdata);
  if (!isMonsterUnlockedInLocker(lockerData, monsterId)) {
    throw cmdRejection("Monster is locked in locker", "ACADEMY_MONSTER_LOCKED");
  }

  const monster = monsterStats[monsterId];
  if (!monster || !Array.isArray(monster.trainingCosts) || monster.trainingCosts.length === 0) {
    throw cmdRejection("Monster is not supported by academy", "ACADEMY_MONSTER_UNSUPPORTED");
  }

  const academyData = ensureAcademyData(save);
  const entry = asRecord(academyData[monsterId]) ?? {};
  academyData[monsterId] = entry;

  const currentLevel = Math.max(1, Math.min(6, parseIntSafe(entry.level, 1)));
  const maxLevel = Math.max(1, Math.min(6, monster.trainingCosts.length + 1));
  entry.level = currentLevel;

  if (currentLevel >= maxLevel) {
    throw cmdRejection("Monster is already fully trained", "ACADEMY_MAX_LEVEL");
  }

  if (currentLevel > academyBuilding.level) {
    throw cmdRejection("Academy level is too low for this training", "ACADEMY_LEVEL_REQUIRED");
  }

  const trainingCost = monster.trainingCosts[currentLevel - 1];
  if (!trainingCost || trainingCost.length < 2) {
    throw cmdRejection("Training cost is invalid for this level", "ACADEMY_COST_INVALID");
  }

  const resourceCost = Math.max(0, parseIntSafe(trainingCost[0], 0));
  const durationSec = Math.max(1, parseIntSafe(trainingCost[1], 0));
  const resourceBag = ensureResourceBag(save, "resources");
  const currentResource = parseIntSafe(resourceBag[ACADEMY_RESOURCE_KEY], 0);
  if (currentResource < resourceCost) {
    throw cmdRejection("Insufficient resources: r3", "INSUFFICIENT_RESOURCES");
  }

  if (resourceCost > 0) {
    resourceBag[ACADEMY_RESOURCE_KEY] = currentResource - resourceCost;
  }

  const nowSec = getCurrentDateTime();
  const completesAt = nowSec + durationSec;
  const targetLevel = Math.min(maxLevel, currentLevel + 1);

  entry.time = completesAt;
  entry.duration = durationSec;
  entry.startedAt = nowSec;
  entry.targetLevel = targetLevel;
  academyBuilding.raw._upgrading = monsterId;
  academyBuilding.raw.upgrading = monsterId;

  return [
    ...(resourceCost > 0
      ? [
          {
            op: "setResources",
            bag: "resources",
            resources: normalizeResourceBag(resourceBag),
          },
        ]
      : []),
    {
      op: "academyStart",
      monsterId,
      fromLevel: currentLevel,
      toLevel: targetLevel,
      durationSec,
      remainingSec: durationSec,
      completesAt,
    },
    {
      op: "setAcademyState",
      academy: buildAcademyStateSummary(save, nowSec),
    },
  ];
}

function handleCancelAcademyUpgrade(
  save: Save,
  args: CancelAcademyUpgradeArgs
): CmdDelta[] {
  const monsterId = normalizeAcademyMonsterId(args.monsterId);
  if (!monsterId) {
    throw cmdRejection("Monster is not supported by academy", "ACADEMY_MONSTER_UNSUPPORTED");
  }

  const academyData = ensureAcademyData(save);
  const entry = asRecord(academyData[monsterId]);
  if (!entry) {
    throw cmdRejection("Academy training is not running", "ACADEMY_NOT_RUNNING");
  }

  const completesAt = parseIntSafe(entry.time, 0);
  if (completesAt <= 0) {
    throw cmdRejection("Academy training is not running", "ACADEMY_NOT_RUNNING");
  }

  const currentLevel = Math.max(1, Math.min(6, parseIntSafe(entry.level, 1)));
  const refundCost = Math.max(
    0,
    parseIntSafe(monsterStats[monsterId]?.trainingCosts?.[currentLevel - 1]?.[0], 0)
  );

  delete entry.time;
  delete entry.duration;
  delete entry.startedAt;
  delete entry.targetLevel;

  clearAcademyBuildingUpgrading(save, monsterId);

  const resourceBag = ensureResourceBag(save, "resources");
  const currentResource = parseIntSafe(resourceBag[ACADEMY_RESOURCE_KEY], 0);
  const maxResource = parseIntSafe(
    resourceBag[`${ACADEMY_RESOURCE_KEY}max`],
    Number.MAX_SAFE_INTEGER
  );
  const nextResource = Math.max(0, Math.min(maxResource, currentResource + refundCost));
  const refundedAmount = Math.max(0, nextResource - currentResource);
  resourceBag[ACADEMY_RESOURCE_KEY] = nextResource;

  const nowSec = getCurrentDateTime();
  return [
    ...(refundedAmount > 0
      ? [
          {
            op: "setResources",
            bag: "resources",
            resources: normalizeResourceBag(resourceBag),
          },
        ]
      : []),
    {
      op: "academyCancel",
      monsterId,
      refundedResourceKey: ACADEMY_RESOURCE_KEY,
      refundedAmount,
    },
    {
      op: "setAcademyState",
      academy: buildAcademyStateSummary(save, nowSec),
    },
  ];
}

function handleFinishAcademyUpgradeNow(
  user: User,
  save: Save,
  args: FinishAcademyUpgradeNowArgs
): CmdDelta[] {
  const monsterId = normalizeAcademyMonsterId(args.monsterId);
  if (!monsterId) {
    throw cmdRejection("Monster is not supported by academy", "ACADEMY_MONSTER_UNSUPPORTED");
  }

  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  const academyBuilding = findAcademyBuilding(buildings);
  if (!academyBuilding) {
    throw cmdRejection("Academy building not found", "ACADEMY_NOT_FOUND");
  }

  const lockerData = asRecord(save.lockerdata);
  if (!isMonsterUnlockedInLocker(lockerData, monsterId)) {
    throw cmdRejection("Monster is locked in locker", "ACADEMY_MONSTER_LOCKED");
  }

  const monster = monsterStats[monsterId];
  if (!monster || !Array.isArray(monster.trainingCosts) || monster.trainingCosts.length === 0) {
    throw cmdRejection("Monster is not supported by academy", "ACADEMY_MONSTER_UNSUPPORTED");
  }

  const academyData = ensureAcademyData(save);
  const entry = asRecord(academyData[monsterId]) ?? {};
  academyData[monsterId] = entry;

  const currentLevel = Math.max(1, Math.min(6, parseIntSafe(entry.level, 1)));
  const maxLevel = Math.max(1, Math.min(6, monster.trainingCosts.length + 1));
  entry.level = currentLevel;

  if (currentLevel >= maxLevel) {
    throw cmdRejection("Monster is already fully trained", "ACADEMY_MAX_LEVEL");
  }

  const academyState = buildAcademyStateSummary(save);
  const nowSec = getCurrentDateTime();
  const trainingEndsAt = parseIntSafe(entry.time, 0);
  const trainingRunning = trainingEndsAt > nowSec;
  const activeMonsterId = academyState.activeMonsterId;

  if (!trainingRunning && isBuildingBusy(academyBuilding.raw)) {
    throw cmdRejection("Academy building is busy", "ACADEMY_BUSY");
  }

  if (activeMonsterId && activeMonsterId !== monsterId) {
    throw cmdRejection("Academy already has active training", "ACADEMY_BUSY");
  }

  if (!trainingRunning && currentLevel > academyBuilding.level) {
    throw cmdRejection("Academy level is too low for this training", "ACADEMY_LEVEL_REQUIRED");
  }

  const trainingCost = monster.trainingCosts[currentLevel - 1];
  if (!trainingCost || trainingCost.length < 2) {
    throw cmdRejection("Training cost is invalid for this level", "ACADEMY_COST_INVALID");
  }

  let spentCredits = 0;
  if (trainingRunning) {
    spentCredits = calculateAcademyTimeSpeedupCost(trainingEndsAt - nowSec);
  } else {
    const resourceCost = Math.max(0, parseIntSafe(trainingCost[0], 0));
    const durationSec = Math.max(1, parseIntSafe(trainingCost[1], 0));
    spentCredits =
      calculateAcademyTimeSpeedupCost(durationSec) +
      calculateAcademyResourceSpeedupCost(resourceCost);
  }

  const userSave = user.save ?? save;
  const currentCredits = parseIntSafe(userSave.credits, 0);
  if (spentCredits > currentCredits) {
    throw cmdRejection("Insufficient credits for academy finish", "INSUFFICIENT_CREDITS");
  }

  const targetLevel = Math.min(maxLevel, currentLevel + 1);
  userSave.credits = currentCredits - spentCredits;
  entry.level = targetLevel;
  delete entry.time;
  delete entry.duration;
  delete entry.startedAt;
  delete entry.targetLevel;
  clearAcademyBuildingUpgrading(save, monsterId);

  return [
    {
      op: "academyFinishNow",
      monsterId,
      fromLevel: currentLevel,
      toLevel: targetLevel,
      spentCredits,
    },
    {
      op: "setCredits",
      credits: userSave.credits,
    },
    {
      op: "setAcademyState",
      academy: buildAcademyStateSummary(save),
    },
  ];
}

function calculateStorePurchaseCost(
  item: string,
  currentQuantity: number,
  quantity: number
): number {
  if (purchaseKeys.has(item)) {
    return quantity;
  }

  const storeItem = storeItems[item];
  const costs = storeItem?.c;
  if (!costs || costs.length === 0) {
    throw cmdRejection("Store item is missing cost definition", "STORE_COST_MISSING");
  }

  let totalCost = 0;
  for (let index = 0; index < quantity; index += 1) {
    const tierIndex = Math.min(currentQuantity + index, costs.length - 1);
    const rawCost = costs[tierIndex] ?? costs[0];
    const unitCost = Math.max(0, parseIntSafe(rawCost, 0));
    totalCost += unitCost;
  }

  return totalCost;
}

function ensureBuildingData(save: Save): Record<string, BuildingDataRecord> {
  const existing = asRecord(save.buildingdata);
  if (existing) {
    return existing as Record<string, BuildingDataRecord>;
  }

  const created: Record<string, BuildingDataRecord> = {};
  save.buildingdata = created;
  return created;
}

function ensureStoreData(save: Save): Record<string, Record<string, unknown>> {
  const existing = asRecord(save.storedata);
  if (existing) {
    return existing as Record<string, Record<string, unknown>>;
  }

  const created: Record<string, Record<string, unknown>> = {};
  save.storedata = created;
  return created;
}

function parseBuildings(buildingData: Record<string, BuildingDataRecord>): ParsedBuilding[] {
  const result: ParsedBuilding[] = [];

  for (const [key, value] of Object.entries(buildingData)) {
    const raw = asRecord(value);
    if (!raw) continue;

    const x = parseIntSafe(raw.x ?? raw.X, Number.NaN);
    const y = parseIntSafe(raw.y ?? raw.Y, Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const id = String(raw.id ?? key);
    const level = parseIntSafe(raw.level ?? raw.l, 1);
    const type = coerceBuildingTypeFromRecord(raw.type, raw.t);
    const typeCode = resolveBuildingTypeCode(raw, type);
    const footprint = parseFootprintFromRaw(raw) ?? getLegacyFootprintTilesByCode(typeCode);

    result.push({
      key,
      id,
      x,
      y,
      level: Math.max(1, level),
      footprint,
      type,
      raw,
    });
  }

  return result;
}

function findBuildingById(buildings: ParsedBuilding[], buildingId: string): ParsedBuilding | null {
  const normalizedId = buildingId.trim();
  const numericId = parseIntSafe(normalizedId, Number.NaN);

  for (const building of buildings) {
    if (building.id === normalizedId) return building;
    const candidateNumeric = parseIntSafe(building.id, Number.NaN);
    if (Number.isFinite(numericId) && candidateNumeric === numericId) return building;
  }

  return null;
}

function countBuildingsByCode(
  buildings: ParsedBuilding[],
  code: number,
  minLevel = 1
): number {
  let count = 0;
  for (const building of buildings) {
    if (
      resolveBuildingTypeCode(building.raw, building.type) === code &&
      building.level >= minLevel
    ) {
      count += 1;
    }
  }
  return count;
}

function findTownHallBuilding(buildings: ParsedBuilding[]): ParsedBuilding | null {
  for (const building of buildings) {
    if (resolveBuildingTypeCode(building.raw, building.type) === TOWN_HALL_CODE) {
      return building;
    }
  }

  return null;
}

function getTownHallLevel(buildings: ParsedBuilding[]): number {
  const townHall = findTownHallBuilding(buildings);
  if (!townHall) return 0;
  return Math.max(1, townHall.level);
}

function findAcademyBuilding(buildings: ParsedBuilding[]): ParsedBuilding | null {
  for (const building of buildings) {
    if (resolveBuildingTypeCode(building.raw, building.type) === ACADEMY_CODE) {
      return building;
    }
  }

  return null;
}

function clearAcademyBuildingUpgrading(save: Save, monsterId: string): void {
  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);
  for (const building of buildings) {
    if (resolveBuildingTypeCode(building.raw, building.type) !== ACADEMY_CODE) continue;

    const upgrading = normalizeAcademyMonsterId(
      building.raw._upgrading ?? building.raw.upgrading
    );
    if (upgrading !== monsterId) continue;

    delete building.raw._upgrading;
    delete building.raw.upgrading;
  }
}

function normalizeBuildingRepairState(raw: BuildingDataRecord): {
  repairable: boolean;
  hp: number;
  maxHp: number;
} {
  const maxHp = parseIntSafe(raw.maxHp ?? raw.maxHealth, Number.NaN);
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    return {
      repairable: false,
      hp: 0,
      maxHp: 0,
    };
  }

  const hp = Math.max(0, Math.min(maxHp, parseIntSafe(raw.hp, maxHp)));
  if (parseIntSafe(raw.hp, Number.NaN) !== hp) {
    raw.hp = hp;
  }

  return {
    repairable: true,
    hp,
    maxHp,
  };
}

function setBuildingRepairing(raw: BuildingDataRecord, repairing: boolean): void {
  const numeric = repairing ? 1 : 0;
  raw.rE = numeric;
  raw.repairing = numeric;
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
    return parseIntSafe(rawEntry, 0) === 2;
  }

  const entry = asRecord(rawEntry);
  if (!entry) return false;
  return parseIntSafe(entry.t ?? entry.state ?? entry.status, 0) === 2;
}

function assertWorkerAvailable(save: Save, buildings: ParsedBuilding[]): void {
  const availableWorkers = getAvailableWorkers(save);
  const activeWorkerTasks = countActiveWorkerTasks(buildings);
  if (activeWorkerTasks >= availableWorkers) {
    throw cmdRejection("No worker is currently available", "WORKER_UNAVAILABLE");
  }
}

function getAvailableWorkers(save: Save): number {
  const storeData = ensureStoreData(save);
  const bew = asRecord(storeData[EXTRA_WORKER_STORE_ITEM]);
  const extras = Math.max(0, parseIntSafe(bew?.q, 0));
  return BASE_WORKER_COUNT + extras;
}

function countActiveWorkerTasks(buildings: ParsedBuilding[]): number {
  let active = 0;
  for (const building of buildings) {
    if (isBuildingBusy(building.raw)) {
      active += 1;
    }
  }
  return active;
}

function isPlacementOccupied(
  buildings: ParsedBuilding[],
  x: number,
  y: number,
  footprint: BuildingFootprint,
  ignoreBuildingId?: string
): boolean {
  return buildings.some((building) => {
    if (ignoreBuildingId && building.id === ignoreBuildingId) return false;
    return footprintsOverlap(
      x,
      y,
      footprint,
      building.x,
      building.y,
      building.footprint
    );
  });
}

function getNextBuildingNumericId(buildings: ParsedBuilding[]): number {
  let maxId = -1;

  for (const building of buildings) {
    const numericId = parseIntSafe(building.id, Number.NaN);
    if (Number.isFinite(numericId) && numericId > maxId) {
      maxId = numericId;
    }

    const numericKey = parseIntSafe(building.key, Number.NaN);
    if (Number.isFinite(numericKey) && numericKey > maxId) {
      maxId = numericKey;
    }
  }

  return maxId + 1;
}

function resolveYardPlannerTemplateData(
  save: Save,
  slotId: number
): Record<string, unknown> | null {
  if (!Array.isArray(save.savetemplate)) return null;

  for (const rawTemplate of save.savetemplate) {
    const template = asRecord(rawTemplate);
    if (!template) continue;

    const candidateSlotId = parseIntSafe(template.slotid ?? template.slotId, 0);
    if (candidateSlotId !== slotId) continue;

    return asRecord(template.data) ?? {};
  }

  return null;
}

function parseYardPlannerTemplateTargets(
  data: Record<string, unknown>
): Array<{ buildingId: string; x: number; y: number }> {
  const targetsById = new Map<string, { buildingId: string; x: number; y: number }>();

  for (const rawNode of Object.values(data)) {
    const node = asRecord(rawNode);
    if (!node) continue;

    const buildingId = normalizeTemplateBuildingId(node.id ?? node.buildingId);
    if (!buildingId) continue;

    const x = parseIntSafe(node.x ?? node.X, Number.NaN);
    const y = parseIntSafe(node.y ?? node.Y, Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    targetsById.set(buildingId, { buildingId, x, y });
  }

  return [...targetsById.values()];
}

function normalizeTemplateBuildingId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const numeric = Math.trunc(value);
    if (numeric <= 0) return null;
    return String(numeric);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric) && String(numeric) === trimmed) {
      if (numeric <= 0) return null;
      return String(numeric);
    }

    return trimmed;
  }

  return null;
}

function assertProjectedYardPlannerLayout(
  buildings: ParsedBuilding[],
  plannedById: Map<string, { x: number; y: number }>
): void {
  const projected = buildings.map((building) => {
    const target = plannedById.get(building.id);
    return {
      id: building.id,
      x: target?.x ?? building.x,
      y: target?.y ?? building.y,
      footprint: building.footprint,
    };
  });

  for (let i = 0; i < projected.length; i += 1) {
    const left = projected[i];
    for (let j = i + 1; j < projected.length; j += 1) {
      const right = projected[j];
      if (
        footprintsOverlap(
          left.x,
          left.y,
          left.footprint,
          right.x,
          right.y,
          right.footprint
        )
      ) {
        throw cmdRejection(
          `Yard planner layout overlaps buildings ${left.id} and ${right.id}`,
          "YARD_PLANNER_TILE_OCCUPIED"
        );
      }
    }
  }
}

type ResourceKey = "r1" | "r2" | "r3" | "r4";
type ResourceBagName = "resources" | "iresources";

type HarvesterTarget = {
  bag: ResourceBagName;
  resourceKey: ResourceKey;
};

function resolveHarvesterTarget(raw: BuildingDataRecord, parsedType: string): HarvesterTarget | null {
  const code = resolveBuildingTypeCode(raw, parsedType);
  if (code === null) return null;

  switch (code) {
    case 1:
      return { bag: "resources", resourceKey: "r1" };
    case 2:
      return { bag: "resources", resourceKey: "r2" };
    case 3:
      return { bag: "resources", resourceKey: "r3" };
    case 4:
      return { bag: "resources", resourceKey: "r4" };
    default:
      return null;
  }
}

function getLegacyMainYardRule(code: number): LegacyMainYardRule {
  const rule = legacyMainYardBuildingRules[code];
  if (!rule) {
    throw cmdRejection("Legacy building rule is missing for this type", "LEGACY_RULE_MISSING");
  }
  return rule;
}

function getLegacyCostForTargetLevel(
  rule: LegacyMainYardRule,
  targetLevel: number
): LegacyBuildCost | null {
  const index = targetLevel - 1;
  if (index < 0 || index >= rule.costs.length) return null;
  return rule.costs[index] ?? null;
}

function assertLegacyQuantityLimit(
  buildings: ParsedBuilding[],
  rule: LegacyMainYardRule,
  townHallLevel: number
): void {
  const allowed = getLegacyQuantityForTownHallLevel(rule.quantityByTownHall, townHallLevel);
  const currentCount = countBuildingsByCode(buildings, rule.code);
  if (currentCount >= allowed) {
    throw cmdRejection("Building limit reached for this Town Hall level", "BUILDING_LIMIT_REACHED");
  }
}

function getLegacyQuantityForTownHallLevel(
  quantityByTownHall: number[],
  townHallLevel: number
): number {
  if (!Array.isArray(quantityByTownHall) || quantityByTownHall.length === 0) return 0;
  const normalizedTownHallLevel = Math.max(0, Math.trunc(townHallLevel));
  const index = Math.min(normalizedTownHallLevel, quantityByTownHall.length - 1);
  return Math.max(0, parseIntSafe(quantityByTownHall[index], 0));
}

function assertLegacyRequirements(
  buildings: ParsedBuilding[],
  requirements: LegacyBuildRequirement[]
): void {
  const missing = getMissingLegacyRequirements(buildings, requirements);
  if (missing.length === 0) return;

  const firstMissing = missing[0];
  throw cmdRejection(
    `Requirement not met: building-${firstMissing.typeCode} x${firstMissing.count} level ${firstMissing.minLevel}+ (found ${firstMissing.found})`,
    "BUILDING_REQUIREMENT_NOT_MET"
  );
}

function getMissingLegacyRequirements(
  buildings: ParsedBuilding[],
  requirements: LegacyBuildRequirement[]
): MissingLegacyRequirement[] {
  const missing: MissingLegacyRequirement[] = [];
  for (const requirement of requirements) {
    const count = Math.max(0, parseIntSafe(requirement.count, 0));
    if (count <= 0) continue;

    const minLevel = Math.max(1, parseIntSafe(requirement.minLevel, 1));
    const typeCode = parseIntSafe(requirement.typeCode, -1);
    if (typeCode <= 0) continue;

    const found = countBuildingsByCode(buildings, typeCode, minLevel);
    if (found < count) {
      missing.push({
        typeCode,
        count,
        minLevel,
        found,
      });
    }
  }
  return missing;
}

function resolveBuildingTypeCode(raw: BuildingDataRecord, parsedType: string): number | null {
  const fromT = parseIntSafe(raw.t, Number.NaN);
  if (Number.isFinite(fromT)) return fromT;

  if (typeof raw.type === "string") {
    const normalized = normalizeBuildingTypeInput(raw.type);
    if (normalized) return normalized.code;
  }

  const normalizedParsed = normalizeBuildingTypeInput(parsedType);
  return normalizedParsed ? normalizedParsed.code : null;
}

function ensureResourceBag(save: Save, bag: ResourceBagName): Record<string, unknown> {
  const saveRecord = save as unknown as Record<string, unknown>;
  const existing = asRecord(saveRecord[bag]);
  if (existing) {
    return existing;
  }

  const created = {
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0,
    r1max: 10000,
    r2max: 10000,
    r3max: 10000,
    r4max: 10000,
  };
  saveRecord[bag] = created;
  return created;
}

function applyResourceGain(
  resourceBag: Record<string, unknown>,
  resourceKey: ResourceKey,
  requestedAmount: number
): number {
  const maxKey = `${resourceKey}max`;
  const current = parseIntSafe(resourceBag[resourceKey], 0);
  const max = parseIntSafe(resourceBag[maxKey], Number.MAX_SAFE_INTEGER);
  const availableSpace = Math.max(0, max - current);
  const accepted = Math.max(0, Math.min(requestedAmount, availableSpace));

  if (accepted > 0) {
    resourceBag[resourceKey] = current + accepted;
  }

  return accepted;
}

function normalizeResourceBag(resourceBag: Record<string, unknown>): Record<string, number> {
  return {
    r1: parseIntSafe(resourceBag.r1, 0),
    r2: parseIntSafe(resourceBag.r2, 0),
    r3: parseIntSafe(resourceBag.r3, 0),
    r4: parseIntSafe(resourceBag.r4, 0),
    r1max: parseIntSafe(resourceBag.r1max, 10000),
    r2max: parseIntSafe(resourceBag.r2max, 10000),
    r3max: parseIntSafe(resourceBag.r3max, 10000),
    r4max: parseIntSafe(resourceBag.r4max, 10000),
  };
}

function applyLegacyBuildCost(save: Save, cost: LegacyBuildCost): CmdDelta[] {
  const required = {
    r1: Math.max(0, parseIntSafe(cost.r1, 0)),
    r2: Math.max(0, parseIntSafe(cost.r2, 0)),
    r3: Math.max(0, parseIntSafe(cost.r3, 0)),
    r4: Math.max(0, parseIntSafe(cost.r4, 0)),
  };

  const resourceBag = ensureResourceBag(save, "resources");
  const missingResourceKeys: ResourceKey[] = [];
  for (const resourceKey of ["r1", "r2", "r3", "r4"] as const) {
    const current = parseIntSafe(resourceBag[resourceKey], 0);
    const needed = required[resourceKey];
    if (current < needed) {
      missingResourceKeys.push(resourceKey);
    }
  }

  if (missingResourceKeys.length > 0) {
    const summary = missingResourceKeys.join(", ");
    throw cmdRejection(`Insufficient resources: ${summary}`, "INSUFFICIENT_RESOURCES");
  }

  let spentAny = false;
  for (const resourceKey of ["r1", "r2", "r3", "r4"] as const) {
    const needed = required[resourceKey];
    if (needed <= 0) continue;
    const current = parseIntSafe(resourceBag[resourceKey], 0);
    resourceBag[resourceKey] = Math.max(0, current - needed);
    spentAny = true;
  }

  if (!spentAny) return [];

  return [
    {
      op: "setResources",
      bag: "resources",
      resources: normalizeResourceBag(resourceBag),
    },
  ];
}

function calculateAcademyTimeSpeedupCost(seconds: number): number {
  const clampedSeconds = Math.max(0, Math.trunc(seconds));
  if (clampedSeconds <= 0) return 0;

  const linearCost = Math.ceil((clampedSeconds * 20) / 60 / 60);
  const sqrtCost = Math.trunc(Math.sqrt(clampedSeconds * 0.8));
  return Math.max(0, Math.min(linearCost, sqrtCost));
}

function calculateAcademyResourceSpeedupCost(resourceCost: number): number {
  const clampedResourceCost = Math.max(0, Math.trunc(resourceCost));
  if (clampedResourceCost <= 0) return 0;

  return Math.ceil(Math.pow(Math.sqrt(clampedResourceCost / 2), 0.75));
}

function assertValidPlacement(
  x: number,
  y: number,
  footprint: BuildingFootprint,
  errorCode: string
): void {
  if (!isFootprintWithinBounds(x, y, footprint, YARD_WIDTH, YARD_HEIGHT)) {
    throw cmdRejection("Coordinates are out of bounds", errorCode);
  }
}

function parseFootprintFromRaw(raw: BuildingDataRecord): BuildingFootprint | null {
  const width = parseIntSafe(raw.footprintW ?? raw.fw, Number.NaN);
  const height = parseIntSafe(raw.footprintH ?? raw.fh, Number.NaN);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return {
    width,
    height,
  };
}

function cmdRejection(message: string, code: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

function buildIdempotencyKey(userId: number, idempotencyKey: string): string {
  return `cmd:${userId}:${idempotencyKey}`;
}

function buildSeqKey(userId: number): string {
  return `cmd-seq:${userId}`;
}

function buildNonceKey(userId: number, nonce: string): string {
  return `cmd-nonce:${userId}:${nonce}`;
}

async function checkRateLimit(userId: number, op: CmdOperation): Promise<boolean> {
  const rule = RATE_LIMITS[op];
  const now = getCurrentDateTime();
  const bucket = Math.floor(now / rule.windowSec);
  const key = `cmd-rate:${userId}:${op}:${bucket}`;

  const current = parseIntSafe(await redis.get(key), 0);
  const next = current + 1;

  await redis.setex(key, rule.windowSec + 2, String(next));
  return next <= rule.max;
}

function respondCmdError(
  ctx: Parameters<KoaController>[0],
  opts: {
    status: number;
    error: string;
    code: string;
    traceId: string;
    op: string;
    userId: number;
    ip: string;
    startedAtMs: number;
    rejectedReason: string;
    payloadHash?: string;
  }
): void {
  logCmdTelemetry({
    userId: opts.userId,
    ip: opts.ip,
    op: opts.op,
    result: "rejected",
    traceId: opts.traceId,
    latencyMs: Date.now() - opts.startedAtMs,
    rejectedReason: opts.rejectedReason,
    payloadHash: opts.payloadHash,
  });

  ctx.status = opts.status;
  ctx.body = {
    error: opts.error,
    code: opts.code,
    traceId: opts.traceId,
  };
}

function logCmdTelemetry(opts: {
  userId: number;
  ip: string;
  op: string;
  result: "ok" | "rejected" | "idempotent-hit";
  traceId: string;
  latencyMs: number;
  rejectedReason?: string;
  payloadHash?: string;
}): void {
  const rejected = opts.rejectedReason ? ` rejectedReason=${opts.rejectedReason}` : "";
  const payloadHash = opts.payloadHash ? ` payloadHash=${opts.payloadHash}` : "";
  logger.info(
    `event=cmd userId=${opts.userId} ip=${opts.ip} op=${opts.op} result=${opts.result} traceId=${opts.traceId} latencyMs=${opts.latencyMs}${rejected}${payloadHash}`
  );
}

function hashPayload(payload: unknown): string {
  try {
    const raw = JSON.stringify(payload) ?? "";
    return createHash("sha256").update(raw).digest("hex");
  } catch {
    return "payload-hash-unavailable";
  }
}

function parseOperationArgs(
  op: CmdOperation,
  rawArgs: unknown
):
  | {
      success: true;
      data:
        | { op: "PlaceBuilding"; args: PlaceBuildingArgs }
        | { op: "MoveBuilding"; args: MoveBuildingArgs }
        | { op: "UpgradeBuilding"; args: UpgradeBuildingArgs }
        | { op: "CancelUpgrade"; args: CancelUpgradeArgs }
        | { op: "CollectHarvester"; args: CollectHarvesterArgs }
        | { op: "PurchaseStoreItem"; args: PurchaseStoreItemArgs }
        | { op: "ApplyYardPlannerTemplate"; args: ApplyYardPlannerTemplateArgs }
        | { op: "StartRepairBuilding"; args: StartRepairBuildingArgs }
        | { op: "StartRepairAllBuildings"; args: StartRepairAllBuildingsArgs }
        | { op: "StartAcademyUpgrade"; args: StartAcademyUpgradeArgs }
        | { op: "CancelAcademyUpgrade"; args: CancelAcademyUpgradeArgs }
        | { op: "FinishAcademyUpgradeNow"; args: FinishAcademyUpgradeNowArgs };
    }
  | { success: false; errors: string } {
  switch (op) {
    case "PlaceBuilding": {
      const parsed = PlaceBuildingArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "MoveBuilding": {
      const parsed = MoveBuildingArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "UpgradeBuilding": {
      const parsed = UpgradeBuildingArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "CancelUpgrade": {
      const parsed = CancelUpgradeArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "CollectHarvester": {
      const parsed = CollectHarvesterArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "PurchaseStoreItem": {
      const parsed = PurchaseStoreItemArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "ApplyYardPlannerTemplate": {
      const parsed = ApplyYardPlannerTemplateArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "StartRepairBuilding": {
      const parsed = StartRepairBuildingArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "StartRepairAllBuildings": {
      const parsed = StartRepairAllBuildingsArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "StartAcademyUpgrade": {
      const parsed = StartAcademyUpgradeArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "CancelAcademyUpgrade": {
      const parsed = CancelAcademyUpgradeArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    case "FinishAcademyUpgradeNow": {
      const parsed = FinishAcademyUpgradeNowArgsSchema.safeParse(rawArgs);
      if (!parsed.success) return { success: false, errors: collectZodIssues(parsed.error.issues) };
      return {
        success: true,
        data: { op, args: parsed.data },
      };
    }

    default: {
      const parsed = CmdOperationSchema.safeParse(op);
      return {
        success: false,
        errors: parsed.success
          ? "Unsupported command operation"
          : collectZodIssues(parsed.error.issues),
      };
    }
  }
}

function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function collectZodIssues(issues: Array<{ message: string }>): string {
  return issues.map((issue) => issue.message).join("; ");
}
