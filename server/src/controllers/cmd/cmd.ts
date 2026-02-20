import { createHash, randomUUID } from "node:crypto";

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../models/user.model.js";
import { Save } from "../../models/save.model.js";
import { postgres, redis } from "../../server.js";
import { Status } from "../../enums/StatusCodes.js";
import { logger } from "../../utils/logger.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import {
  CancelUpgradeArgsSchema,
  CmdEnvelopeSchema,
  CmdOperationSchema,
  CmdSuccessResponseSchema,
  CollectHarvesterArgsSchema,
  MoveBuildingArgsSchema,
  PlaceBuildingArgsSchema,
  UpgradeBuildingArgsSchema,
  type CancelUpgradeArgs,
  type CmdOperation,
  type CollectHarvesterArgs,
  type MoveBuildingArgs,
  type PlaceBuildingArgs,
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

const RATE_LIMITS: Record<CmdOperation, { max: number; windowSec: number }> = {
  PlaceBuilding: { max: 25, windowSec: 10 },
  MoveBuilding: { max: 40, windowSec: 10 },
  UpgradeBuilding: { max: 20, windowSec: 30 },
  CancelUpgrade: { max: 20, windowSec: 30 },
  CollectHarvester: { max: 60, windowSec: 10 },
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
  const placementFootprint = getLegacyFootprintTilesByCode(buildingTypeCode);

  assertValidPlacement(args.x, args.y, placementFootprint, "INVALID_COORDS");

  const buildingData = ensureBuildingData(save);
  const buildings = parseBuildings(buildingData);

  if (isPlacementOccupied(buildings, args.x, args.y, placementFootprint)) {
    throw cmdRejection("Tile already occupied", "TILE_OCCUPIED");
  }

  const nextNumericId = getNextBuildingNumericId(buildings);
  const key = String(nextNumericId);
  const level = 1;

  buildingData[key] = {
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

  return [
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

  const currentLevel = targetBuilding.level > 0 ? targetBuilding.level : 1;
  const requestedLevel = args.targetLevel ?? currentLevel + 1;

  if (requestedLevel <= currentLevel) {
    throw cmdRejection("Target level must be greater than current level", "INVALID_LEVEL");
  }

  if (requestedLevel > MAX_BUILDING_LEVEL) {
    throw cmdRejection("Target level exceeds allowed maximum", "LEVEL_CAP_EXCEEDED");
  }

  const deferSeconds = args.deferSeconds ?? 0;
  if (deferSeconds > 0) {
    const pending = parseIntSafe(targetBuilding.raw.cU ?? targetBuilding.raw.countdownUpgrade, 0);
    if (pending > 0) {
      throw cmdRejection("Upgrade is already running for this building", "UPGRADE_ALREADY_RUNNING");
    }

    targetBuilding.raw.cU = deferSeconds;
    targetBuilding.raw.countdownUpgrade = deferSeconds;
    targetBuilding.raw.upgradeToLevel = requestedLevel;
    targetBuilding.raw.upgradeStartedAt = getCurrentDateTime();

    return [
      {
        op: "startUpgrade",
        id: targetBuilding.id,
        fromLevel: currentLevel,
        toLevel: requestedLevel,
        remainingSec: deferSeconds,
      },
    ];
  }

  targetBuilding.raw.cU = 0;
  targetBuilding.raw.countdownUpgrade = 0;
  delete targetBuilding.raw.upgradeToLevel;
  delete targetBuilding.raw.upgradeStartedAt;
  targetBuilding.raw.l = requestedLevel;
  targetBuilding.raw.level = requestedLevel;

  return [
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

function ensureBuildingData(save: Save): Record<string, BuildingDataRecord> {
  const existing = asRecord(save.buildingdata);
  if (existing) {
    return existing as Record<string, BuildingDataRecord>;
  }

  const created: Record<string, BuildingDataRecord> = {};
  save.buildingdata = created;
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
    case 5:
      return { bag: "iresources", resourceKey: "r1" };
    case 6:
      return { bag: "iresources", resourceKey: "r2" };
    case 7:
      return { bag: "iresources", resourceKey: "r3" };
    case 8:
      return { bag: "iresources", resourceKey: "r4" };
    default:
      return null;
  }
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
        | { op: "CollectHarvester"; args: CollectHarvesterArgs };
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
