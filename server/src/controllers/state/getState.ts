import { randomUUID } from "node:crypto";
import z from "zod";

import { BaseType } from "../../enums/Base.js";
import { Status } from "../../enums/StatusCodes.js";
import { Save } from "../../models/save.model.js";
import { User } from "../../models/user.model.js";
import { postgres } from "../../server.js";
import {
  YARD_HEIGHT,
  YARD_WIDTH,
  deriveYardTheme,
  parseIntSafe,
  toNormalizedBuildings,
  toResourceSummary,
} from "../../services/state/normalizeState.js";
import type { KoaController } from "../../utils/KoaController.js";
import { logger } from "../../utils/logger.js";
import {
  StateQuerySchema,
  StateSnapshotResponseSchema,
  type StateQuery,
} from "../../zod/StateSchema.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";

const MAIN_BASE_ALIASES = new Set(["home", "self", "main", "default", "0"]);
const INFERNO_BASE_ALIASES = new Set(["inferno", "i", "inferno-main"]);

export const getState: KoaController = async (ctx) => {
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
      logger.info(
        `event=state_snapshot userId=${user.userid} ip=${ctx.ip} result=rejected code=STATE_BASE_NOT_FOUND traceId=${traceId}`
      );
      ctx.status = Status.NOT_FOUND;
      ctx.body = {
        error: "Requested base was not found for this user.",
        code: "STATE_BASE_NOT_FOUND",
        traceId,
      };
      return;
    }

    const response = StateSnapshotResponseSchema.parse(
      buildStateSnapshot(user, targetSave)
    );

    logger.info(
      `event=state_snapshot userId=${user.userid} ip=${ctx.ip} baseId=${targetSave.baseid} scope=${query.scope} result=ok traceId=${traceId}`
    );

    ctx.status = Status.OK;
    ctx.body = response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = {
        error: "Invalid state snapshot query.",
        code: "INVALID_STATE_QUERY",
        traceId,
        details: err.issues.map((issue) => issue.message),
      };
      return;
    }

    logger.error(
      `event=state_snapshot userId=${user.userid} ip=${ctx.ip} result=failed traceId=${traceId} error=${formatError(err)}`
    );

    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = {
      error: "Failed to build state snapshot.",
      code: "STATE_SNAPSHOT_FAILED",
      traceId,
    };
  }
};

export function parseStateQuery(raw: unknown): StateQuery {
  const query = asRecord(raw) ?? {};
  const baseId = firstQueryValue(query.baseId ?? query.baseid);
  const scope = firstQueryValue(query.scope);

  return StateQuerySchema.parse({
    ...(baseId ? { baseId } : {}),
    ...(scope ? { scope } : {}),
  });
}

export async function resolveTargetSave(
  user: User,
  query: StateQuery
): Promise<Save | null> {
  if (query.scope === "inferno") {
    return resolveInfernoSave(user, query.baseId);
  }

  if (!query.baseId) {
    return user.save ?? null;
  }

  const normalized = query.baseId.trim().toLowerCase();
  if (MAIN_BASE_ALIASES.has(normalized)) {
    return user.save ?? null;
  }

  if (query.scope === "auto" && INFERNO_BASE_ALIASES.has(normalized)) {
    return resolveInfernoSave(user);
  }

  return postgres.em.findOne(Save, {
    baseid: query.baseId,
    saveuserid: user.userid,
  });
}

export async function resolveInfernoSave(
  user: User,
  requestedBaseId?: string
): Promise<Save | null> {
  if (!requestedBaseId) {
    return user.infernosave ?? null;
  }

  const normalized = requestedBaseId.trim().toLowerCase();
  if (MAIN_BASE_ALIASES.has(normalized) || INFERNO_BASE_ALIASES.has(normalized)) {
    return user.infernosave ?? null;
  }

  return postgres.em.findOne(Save, {
    baseid: requestedBaseId,
    saveuserid: user.userid,
    type: BaseType.INFERNO,
  });
}

export function buildStateSnapshot(user: User, save: Save) {
  const isInfernoBase =
    save.type === BaseType.INFERNO || save.type === BaseType.INFERNO_TRIBE;
  const activeResources = isInfernoBase && user.save?.iresources
    ? user.save.iresources
    : save.resources;

  const worldId = normalizeWorldId(save.worldid ?? user.save?.worldid);
  const outpostCount = Array.isArray(user.save?.outposts) ? user.save.outposts.length : 0;

  return {
    snapshotVersion: 1 as const,
    serverTime: getCurrentDateTime(),
    player: {
      userId: user.userid,
      username: user.username,
      banned: Boolean(user.banned),
      chatEnabled: parseIntSafe(save.chatenabled, 0) > 0,
      friendCount: parseIntSafe(user.friendcount, 0),
    },
    base: {
      baseId: String(save.baseid),
      baseSaveId: save.basesaveid,
      type: save.type,
      yardWidth: YARD_WIDTH,
      yardHeight: YARD_HEIGHT,
      yardTheme: deriveYardTheme(save),
    },
    progression: {
      level: Math.max(1, parseIntSafe(save.level, 1)),
      tutorialStage: Math.max(0, parseIntSafe(save.tutorialstage, 0)),
      points: Math.max(0, parseIntSafe(save.points, 0)),
      baseValue: Math.max(0, parseIntSafe(save.basevalue, 0)),
      empireValue: Math.max(0, parseIntSafe(save.empirevalue, 0)),
      credits: Math.max(0, parseIntSafe(user.save?.credits ?? save.credits, 0)),
      protected: Math.max(0, parseIntSafe(save.protected, 0)),
      damage: Math.max(0, parseIntSafe(save.damage, 0)),
      destroyed: Math.max(0, parseIntSafe(save.destroyed, 0)),
    },
    resources: {
      active: toResourceSummary(activeResources),
      main: user.save ? toResourceSummary(user.save.resources) : undefined,
      inferno: user.save?.iresources
        ? toResourceSummary(user.save.iresources)
        : user.infernosave?.resources
          ? toResourceSummary(user.infernosave.resources)
          : undefined,
    },
    buildings: toNormalizedBuildings(save, {
      yardWidth: YARD_WIDTH,
      yardHeight: YARD_HEIGHT,
    }),
    maproom: {
      worldId,
      mapVersion: Math.max(0, parseIntSafe(save.usemap, 0)),
      outpostCount,
      canAttack: Boolean(save.canattack),
    },
  };
}

function normalizeWorldId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
