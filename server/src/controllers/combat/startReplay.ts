import { randomUUID } from "node:crypto";

import { Status } from "../../enums/StatusCodes.js";
import { Save } from "../../models/save.model.js";
import { User } from "../../models/user.model.js";
import { createAttackLog } from "../../services/base/createAttackLog.js";
import { buildCombatReplaySession } from "../../services/combat/replayEngine.js";
import { wildMonsterSave } from "../../services/maproom/v2/wildMonsters.js";
import { postgres, redis } from "../../server.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import {
  CombatStartRequestSchema,
  CombatStartResponseSchema,
  CombatReplaySessionSchema,
} from "../../zod/CombatReplaySchema.js";

const COMBAT_SESSION_TTL_SECONDS = 60 * 15;
const COMBAT_START_IDEMPOTENCY_TTL_SECONDS = 60 * 10;

export const startCombatReplay: KoaController = async (ctx) => {
  const traceId = randomUUID();
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const attackerSave = user.save ?? (await Save.createMainSave(postgres.em, user));

  const parseResult = CombatStartRequestSchema.safeParse(ctx.request.body ?? {});
  if (!parseResult.success) {
    ctx.status = Status.BAD_REQUEST;
    ctx.body = {
      error: "Invalid combat start payload.",
      code: "INVALID_COMBAT_START",
      traceId,
      details: parseResult.error.issues.map((issue) => issue.message),
    };
    return;
  }

  const payload = parseResult.data;
  const ownBaseIds = new Set([
    String(attackerSave.baseid),
    ...((Array.isArray(attackerSave.outposts) ? attackerSave.outposts : [])
      .map((entry) => String(entry?.[2] ?? ""))),
  ]);

  if (ownBaseIds.has(payload.targetBaseId)) {
    ctx.status = Status.CONFLICT;
    ctx.body = {
      error: "Cannot start combat replay against your own base.",
      code: "COMBAT_OWN_BASE_FORBIDDEN",
      traceId,
    };
    return;
  }

  const idempotencyKey = payload.idempotencyKey?.trim();
  if (idempotencyKey) {
    const replayCacheKey = buildStartIdempotencyKey(user.userid, idempotencyKey);
    const cachedRaw = await redis.get(replayCacheKey);
    const cachedParsed = safeParseJson(cachedRaw);
    const cached = CombatStartResponseSchema.safeParse(cachedParsed);
    if (cached.success) {
      ctx.status = Status.OK;
      ctx.body = cached.data;
      return;
    }
  }

  let defenderSave = await postgres.em.findOne(Save, { baseid: payload.targetBaseId });
  let targetType: "player" | "wild" = "player";

  if (!defenderSave) {
    defenderSave = wildMonsterSave(payload.targetBaseId);
    targetType = "wild";
  }

  if (targetType === "player") {
    const defenderOwnerId = Number(defenderSave.saveuserid ?? defenderSave.userid ?? 0);
    if (defenderOwnerId > 0 && defenderOwnerId === user.userid) {
      ctx.status = Status.CONFLICT;
      ctx.body = {
        error: "Cannot start combat replay against your own base.",
        code: "COMBAT_OWN_BASE_FORBIDDEN",
        traceId,
      };
      return;
    }
  }

  const replayId = randomUUID();
  const session = buildCombatReplaySession({
    replayId,
    attackerUser: user,
    attackerSave,
    defenderSave,
    targetType,
    durationSec: payload.durationSec,
    tickMs: payload.tickMs,
  });

  const parsedSession = CombatReplaySessionSchema.parse(session);
  const sessionKey = buildReplaySessionKey(user.userid, replayId);
  await redis.setex(sessionKey, COMBAT_SESSION_TTL_SECONDS, JSON.stringify(parsedSession));

  const apiVersion = String((ctx.params as { apiVersion?: string } | undefined)?.apiVersion ?? "v1.5.0-beta");
  const response = CombatStartResponseSchema.parse({
    replayId,
    streamPath: `/api/${encodeURIComponent(apiVersion)}/combat/replay/${encodeURIComponent(replayId)}`,
    startedAt: parsedSession.createdAt,
    expiresAt: parsedSession.expiresAt,
    tickMs: parsedSession.tickMs,
    totalTicks: parsedSession.totalTicks,
    estimatedDurationMs: parsedSession.totalTicks * parsedSession.tickMs,
  });

  if (idempotencyKey) {
    const replayCacheKey = buildStartIdempotencyKey(user.userid, idempotencyKey);
    await redis.setex(
      replayCacheKey,
      COMBAT_START_IDEMPOTENCY_TTL_SECONDS,
      JSON.stringify(response)
    );
  }

  if (targetType === "player") {
    try {
      const defenderUser = await postgres.em.findOne(User, {
        userid: Number(defenderSave.saveuserid),
      });
      if (defenderUser) {
        await createAttackLog(user, defenderUser, defenderSave);
      }
    } catch (error) {
      logger.error(
        `event=combat_replay_start userId=${user.userid} targetBaseId=${defenderSave.baseid} traceId=${traceId} msg=attack_log_failed error=${formatError(error)}`
      );
    }
  }

  logger.info(
    `event=combat_replay_start userId=${user.userid} ip=${ctx.ip} targetBaseId=${defenderSave.baseid} targetType=${targetType} replayId=${replayId} traceId=${traceId}`
  );

  ctx.status = Status.OK;
  ctx.body = response;
};

function buildReplaySessionKey(userId: number, replayId: string): string {
  return `combat-replay:${userId}:${replayId}`;
}

function buildStartIdempotencyKey(userId: number, idempotencyKey: string): string {
  return `combat-start:${userId}:${idempotencyKey}`;
}

function safeParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

