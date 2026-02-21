import { randomUUID } from "node:crypto";
import z from "zod";

import { Status } from "../../enums/StatusCodes.js";
import { Save } from "../../models/save.model.js";
import { User } from "../../models/user.model.js";
import { subscribeStateStream } from "../../services/stream/stateStreamBus.js";
import { postgres } from "../../server.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import { applyLegacyBuildingProgress } from "../../services/state/applyLegacyBuildingProgress.js";
import { applyLegacyAcademyProgress } from "../../services/state/academyState.js";
import {
  StateStreamDeltaPayloadSchema,
  StateStreamReadyPayloadSchema,
  StateStreamSnapshotPayloadSchema,
  StateStreamTickPayloadSchema,
} from "../../zod/StateStreamSchema.js";
import {
  buildStateSnapshot,
  parseStateQuery,
  resolveTargetSave,
} from "./getState.js";

const HEARTBEAT_INTERVAL_MS = 15_000;

export const streamState: KoaController = async (ctx) => {
  const traceId = randomUUID();
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save", "infernosave"]);

  if (!user.save) {
    user.save = await Save.createMainSave(postgres.em, user);
  }

  try {
    const query = parseStateQuery(ctx.query);
    const targetSave = await resolveTargetSave(user, query);

    if (!targetSave) {
      ctx.status = Status.NOT_FOUND;
      ctx.body = {
        error: "Requested base was not found for this user.",
        code: "STATE_BASE_NOT_FOUND",
        traceId,
      };
      return;
    }

    const baseId = String(targetSave.baseid);
    const connectionId = randomUUID();
    const req = ctx.req;
    const res = ctx.res;
    let closed = false;
    let unsubscribe: (() => void) | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let progressCursorSec = normalizeTimestamp(targetSave.savetime);

    // SSE requires bypassing Koa default response handling.
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
      unsubscribe?.();
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      req.off("close", closeConnection);
      req.off("aborted", closeConnection);
      res.off("close", closeConnection);
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }

      logger.info(
        `event=state_stream userId=${user.userid} ip=${ctx.ip} baseId=${baseId} result=closed connectionId=${connectionId} traceId=${traceId}`
      );
    };

    const readyPayload = StateStreamReadyPayloadSchema.parse({
      connectionId,
      serverTime: getCurrentDateTime(),
      snapshotVersion: 1 as const,
    });
    writeEvent("ready", readyPayload);

    const snapshotNow = getCurrentDateTime();
    applyLegacyBuildingProgress(targetSave, snapshotNow, {
      baselineSec: progressCursorSec,
    });
    applyLegacyAcademyProgress(targetSave, snapshotNow);
    progressCursorSec = snapshotNow;

    const initialSnapshot = StateStreamSnapshotPayloadSchema.parse({
      reason: "initial" as const,
      snapshot: buildStateSnapshot(user, targetSave),
    });
    writeEvent("snapshot", initialSnapshot);

    unsubscribe = subscribeStateStream(user.userid, (event) => {
      try {
        if (event.baseId !== baseId) return;
        const payload = StateStreamDeltaPayloadSchema.parse({
          serverTime: event.serverTime,
          seq: event.seq,
          baseId: event.baseId,
          op: event.op,
          delta: event.delta,
        });
        if (!writeEvent("delta", payload)) {
          closeConnection();
        }
      } catch (error) {
        logger.error(
          `event=state_stream userId=${user.userid} ip=${ctx.ip} result=delta_send_failed connectionId=${connectionId} traceId=${traceId} error=${formatError(error)}`
        );
      }
    });

    heartbeatTimer = setInterval(() => {
      const serverTime = getCurrentDateTime();
      const progress = applyLegacyBuildingProgress(targetSave, serverTime, {
        baselineSec: progressCursorSec,
      });
      const academyProgress = applyLegacyAcademyProgress(targetSave, serverTime);
      progressCursorSec = serverTime;

      if (progress.changed || academyProgress.changed) {
        const snapshotPayload = StateStreamSnapshotPayloadSchema.parse({
          reason: "resync" as const,
          snapshot: buildStateSnapshot(user, targetSave),
        });
        if (!writeEvent("snapshot", snapshotPayload)) {
          closeConnection();
          return;
        }
      }

      const tickPayload = StateStreamTickPayloadSchema.parse({
        serverTime,
      });
      if (!writeEvent("tick", tickPayload)) {
        closeConnection();
      }
    }, HEARTBEAT_INTERVAL_MS);

    req.on("close", closeConnection);
    req.on("aborted", closeConnection);
    res.on("close", closeConnection);

    logger.info(
      `event=state_stream userId=${user.userid} ip=${ctx.ip} baseId=${baseId} result=connected connectionId=${connectionId} traceId=${traceId}`
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = {
        error: "Invalid stream query.",
        code: "INVALID_STATE_QUERY",
        traceId,
        details: err.issues.map((issue) => issue.message),
      };
      return;
    }

    logger.error(
      `event=state_stream userId=${user.userid} ip=${ctx.ip} result=failed traceId=${traceId} error=${formatError(err)}`
    );

    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = {
      error: "Failed to open state stream.",
      code: "STATE_STREAM_FAILED",
      traceId,
    };
  }
};

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
}
