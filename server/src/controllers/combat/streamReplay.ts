import { randomUUID } from "node:crypto";

import { Status } from "../../enums/StatusCodes.js";
import { User } from "../../models/user.model.js";
import { redis } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import {
  CombatReplayFrameSchema,
  CombatReplayReadyPayloadSchema,
  CombatReplayResultSchema,
  CombatReplaySessionSchema,
  CombatReplaySnapshotPayloadSchema,
} from "../../zod/CombatReplaySchema.js";

const FAST_PLAYBACK_INTERVAL_MS = 20;

export const streamCombatReplay: KoaController = async (ctx) => {
  const traceId = randomUUID();
  const user: User = ctx.authUser;
  const replayId = String((ctx.params as { replayId?: string } | undefined)?.replayId ?? "");

  if (!replayId) {
    ctx.status = Status.BAD_REQUEST;
    ctx.body = {
      error: "Missing replay id.",
      code: "COMBAT_REPLAY_ID_REQUIRED",
      traceId,
    };
    return;
  }

  const replayKey = buildReplaySessionKey(user.userid, replayId);
  const sessionRaw = await redis.get(replayKey);
  const sessionParsed = safeParseJson(sessionRaw);
  const sessionResult = CombatReplaySessionSchema.safeParse(sessionParsed);

  if (!sessionResult.success) {
    ctx.status = Status.NOT_FOUND;
    ctx.body = {
      error: "Combat replay not found or expired.",
      code: "COMBAT_REPLAY_NOT_FOUND",
      traceId,
    };
    return;
  }

  const session = sessionResult.data;
  const fromTickRaw = String((ctx.query as Record<string, unknown>)?.fromTick ?? "1");
  const fromTick = Number.parseInt(fromTickRaw, 10);
  const speedRaw = String((ctx.query as Record<string, unknown>)?.speed ?? "realtime").toLowerCase();
  const playbackIntervalMs =
    speedRaw === "fast"
      ? FAST_PLAYBACK_INTERVAL_MS
      : Math.max(100, Math.min(1500, session.tickMs));

  const replayFrames = Number.isFinite(fromTick) && fromTick > 1
    ? session.frames.filter((frame) => frame.tick >= fromTick)
    : session.frames;

  const req = ctx.req;
  const res = ctx.res;
  let closed = false;
  let frameTimer: ReturnType<typeof setInterval> | null = null;
  let frameIndex = 0;

  ctx.respond = false;
  req.setTimeout(0);
  res.statusCode = Status.OK;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const writeEvent = (eventName: string, payload: unknown): boolean => {
    if (closed || res.writableEnded || res.destroyed) return false;

    let encoded = "";
    try {
      encoded = JSON.stringify(payload);
    } catch {
      return false;
    }

    res.write(`event: ${eventName}\n`);
    res.write(`data: ${encoded}\n\n`);
    return true;
  };

  const closeConnection = () => {
    if (closed) return;
    closed = true;

    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }

    req.off("close", closeConnection);
    req.off("aborted", closeConnection);
    res.off("close", closeConnection);

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }

    logger.info(
      `event=combat_replay_stream userId=${user.userid} ip=${ctx.ip} replayId=${replayId} result=closed traceId=${traceId}`
    );
  };

  const readyPayload = CombatReplayReadyPayloadSchema.parse({
    replayId: session.replayId,
    serverTime: getCurrentDateTime(),
    schemaVersion: 1 as const,
    tickMs: session.tickMs,
    totalTicks: session.totalTicks,
  });
  writeEvent("ready", readyPayload);

  const snapshotPayload = CombatReplaySnapshotPayloadSchema.parse({
    replayId: session.replayId,
    seed: session.seed,
    startedAt: session.createdAt,
    attacker: session.attacker,
    defender: session.defender,
  });
  writeEvent("snapshot", snapshotPayload);

  frameTimer = setInterval(() => {
    if (closed) return;

    if (frameIndex >= replayFrames.length) {
      const resultPayload = CombatReplayResultSchema.parse(session.result);
      writeEvent("result", resultPayload);
      closeConnection();
      return;
    }

    const framePayload = CombatReplayFrameSchema.parse(replayFrames[frameIndex]);
    frameIndex += 1;
    if (!writeEvent("frame", framePayload)) {
      closeConnection();
    }
  }, playbackIntervalMs);

  req.on("close", closeConnection);
  req.on("aborted", closeConnection);
  res.on("close", closeConnection);

  logger.info(
    `event=combat_replay_stream userId=${user.userid} ip=${ctx.ip} replayId=${replayId} result=connected traceId=${traceId} playback=${speedRaw} fromTick=${Number.isFinite(fromTick) ? fromTick : 1}`
  );
};

function buildReplaySessionKey(userId: number, replayId: string): string {
  return `combat-replay:${userId}:${replayId}`;
}

function safeParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

