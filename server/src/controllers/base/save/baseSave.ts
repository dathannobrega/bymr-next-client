import { randomUUID } from "node:crypto";
import z from "zod";

import { type FieldData, Save } from "../../../models/save.model.js";
import { User } from "../../../models/user.model.js";
import { postgres } from "../../../server.js";
import { FilterFrontendKeys } from "../../../utils/FrontendKey.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { logger } from "../../../utils/logger.js";
import { Status } from "../../../enums/StatusCodes.js";
import { SaveKeys } from "../../../enums/SaveKeys.js";
import { BaseSaveSchema } from "../../../zod/BaseSaveSchema.js";
import { resourcesHandler } from "./handlers/resourceHandler.js";
import { purchaseHandler } from "./handlers/purchaseHandler.js";
import { academyHandler } from "./handlers/academyHandler.js";
import { mapUserSaveData } from "../mapUserSaveData.js";
import { BaseType } from "../../../enums/Base.js";
import { permissionErr, saveFailureErr } from "../../../errors/errors.js";
import { attackLootHandler } from "./handlers/attackLootHandler.js";
import { monsterUpdateHandler } from "./handlers/monsterUpdateHandler.js";
import { validateSave } from "../../../scripts/anticheat/anticheat.js";
import { updateResources } from "../../../services/base/updateResources.js";
import { buildingDataHandler } from "./handlers/buildingDataHandler.js";

const NonCriticalActionSchema = z.enum([
  "SetDecorationVisibility",
  "SetCosmeticLoadout",
  "SetUiPreference",
]);

const NextClientBaseSaveSchema = z
  .object({
    baseId: z.string().min(1),
    action: NonCriticalActionSchema,
    payload: z.record(z.string(), z.unknown()),
    audit: z.object({
      action: NonCriticalActionSchema,
      at: z.string().min(1),
      clientVersion: z.string().min(1),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.action !== value.audit.action) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "action and audit.action must match",
      });
    }
  });

const TRUE_LIKE_VALUES = new Set(["1", "true", "yes", "enabled"]);

/**
 * Controller responsible for saving the user's base data.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} A promise that resolves when the base save process is complete.
 * @throws Will throw an error if the save operation fails.
 */
export const baseSave: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save"]);
  const userSave = user.save ?? (await Save.createMainSave(postgres.em, user));

  const nextClientPayload = NextClientBaseSaveSchema.safeParse(ctx.request.body);
  if (nextClientPayload.success) {
    if (isNextClientBaseSaveDeprecated()) {
      respondNextClientBaseSaveDeprecated(ctx, user, nextClientPayload.data);
      return;
    }

    try {
      await handleNextClientNonCriticalSave(ctx, user, userSave, nextClientPayload.data);
    } catch (err) {
      if (err instanceof Error && "isClientFriendly" in err) {
        throw err;
      }

      logger.error(
        `Failed non-critical save for user: ${user.username} | userId=${user.userid} | error=${formatError(err)}`
      );
      ctx.status = Status.INTERNAL_SERVER_ERROR;
      ctx.body = { error: `Failed non-critical save for user: ${user.username}` };
    }
    return;
  }

  try {
    const saveData = BaseSaveSchema.parse(ctx.request.body);

    const { basesaveid } = saveData;
    const baseSave = await postgres.em.findOne(Save, { basesaveid });

    if (!baseSave) throw saveFailureErr();

    const isOwner = baseSave.saveuserid === user.userid;
    const isOutpostOwner = isOwner && baseSave.type === BaseType.OUTPOST;
    const isAttack = !isOwner && baseSave.attackid !== 0;

    // Not the owner and not in an attack
    if (!isOwner && baseSave.attackid === 0) throw permissionErr();

    await validateSave(user, baseSave, ctx.request.body);

    // Standard save logic
    for (const key of isAttack ? Save.attackSaveKeys : Save.saveKeys) {
      const value = ctx.request.body[key];

      switch (key) {
        case SaveKeys.RESOURCES:
          resourcesHandler(baseSave, value);
          if (isOutpostOwner) {
            const resources = JSON.parse(value);
            userSave.resources = updateResources(resources, userSave.resources);
          }
          break;

        case SaveKeys.POINTS:
          baseSave.points = value.toString();
          break;

        case SaveKeys.BASEVALUE:
          baseSave.basevalue = value.toString();
          break;

        case SaveKeys.IRESOURCES:
          resourcesHandler(baseSave, value, SaveKeys.IRESOURCES);
          break;

        case SaveKeys.PURCHASE:
          purchaseHandler(ctx, saveData.purchase, userSave);
          break;

        case SaveKeys.ACADEMY:
          academyHandler(ctx, baseSave);
          break;

        case SaveKeys.BUILDINGDATA:
          if (isAttack) {
            buildingDataHandler(saveData.buildingdata, baseSave);
          } else {
            baseSave[SaveKeys.BUILDINGDATA] = saveData.buildingdata;
          }

        case SaveKeys.CHAMPION:
          if (isAttack) {
            userSave[SaveKeys.CHAMPION] = saveData.attackerchampion;
          } else {
            baseSave[SaveKeys.CHAMPION] = saveData.champion;
          }
          break;

        case SaveKeys.ATTACKERSIEGE:
          if (isAttack) {
            userSave.siege = saveData.attackersiege;
          }
          break;

        default:
          if (value) {
            try {
              baseSave[key] = JSON.parse(value);
            } catch (_) {
              baseSave[key] = value;
            }
          }
      }

      if (isOutpostOwner) updateOutposts(userSave, baseSave, key);
    }

    if (isAttack) {
      for (const key of Object.keys(saveData)) {
        const value = saveData[key];
        switch (key) {
          case SaveKeys.MONSTERUPDATE:
            await monsterUpdateHandler(value, userSave);
            break;

          case SaveKeys.ATTACKLOOT:
            attackLootHandler(value, userSave);
            break;

          default:
            break;
        }
      }
      await postgres.em.persistAndFlush(userSave);
    }

    // Set the attackid to 0 if the attack is over
    baseSave.attackid = saveData.over ? 0 : baseSave.attackid;
    //if (over) save.protected = isNaN(destroyed) ? 0 : destroyed;

    baseSave.id = baseSave.savetime;
    baseSave.savetime = getCurrentDateTime();
    await postgres.em.persistAndFlush(baseSave);

    const filteredSave = FilterFrontendKeys(baseSave);
    logger.info(`Saving ${user.username}'s base | IP: ${ctx.ip}`);

    const responseBody = {
      error: 0,
      basesaveid: baseSave.basesaveid,
      ...filteredSave,
      champion: JSON.stringify(filteredSave.champion),
    };

    if (user.userid === filteredSave.userid) {
      Object.assign(responseBody, mapUserSaveData(user));
    }

    ctx.status = Status.OK;
    ctx.body = responseBody;
  } catch (err) {
    if (err instanceof z.ZodError) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = {
        error: "Invalid base save payload.",
        details: err.issues.map((issue) => issue.message),
      };
      return;
    }

    if (err instanceof Error && 'isClientFriendly' in err) {
      throw err;
    }

    logger.error(
      `Failed to save base for user: ${user.username} | userId=${user.userid} | error=${formatError(err)}`
    );

    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: `Failed to save for user: ${user.username}` };
  }
};

function isNextClientBaseSaveDeprecated(): boolean {
  const rawValue = process.env.DISABLE_NEXT_CLIENT_BASE_SAVE?.trim().toLowerCase();
  if (!rawValue) return false;
  return TRUE_LIKE_VALUES.has(rawValue);
}

function respondNextClientBaseSaveDeprecated(
  ctx: Parameters<KoaController>[0],
  user: User,
  payload: z.infer<typeof NextClientBaseSaveSchema>
): void {
  const traceId = randomUUID();

  logger.info(
    `event=base_save userId=${user.userid} ip=${ctx.ip} action=${payload.action} result=rejected code=NEXT_CLIENT_BASE_SAVE_DEPRECATED traceId=${traceId}`
  );

  ctx.status = Status.CONFLICT;
  ctx.body = {
    error: "Endpoint /base/save is deprecated for next-client. Use /api/:apiVersion/cmd.",
    code: "NEXT_CLIENT_BASE_SAVE_DEPRECATED",
    traceId,
    details: {
      action: payload.action,
      migrationPath: "/api/:apiVersion/cmd",
      flag: "DISABLE_NEXT_CLIENT_BASE_SAVE",
    },
  };
}

async function handleNextClientNonCriticalSave(
  ctx: Parameters<KoaController>[0],
  user: User,
  userSave: Save,
  payload: z.infer<typeof NextClientBaseSaveSchema>
): Promise<void> {
  const targetSave = await resolveTargetSave(user, userSave, payload.baseId);
  if (!targetSave || targetSave.saveuserid !== user.userid) {
    throw permissionErr();
  }

  const playerData = asRecord(targetSave.player) ?? {};

  switch (payload.action) {
    case "SetUiPreference": {
      const uiPreferences = asRecord(playerData.uiPreferences) ?? {};
      const key = typeof payload.payload.key === "string" ? payload.payload.key : "unknown";
      uiPreferences[key] = payload.payload.value;
      playerData.uiPreferences = uiPreferences;
      break;
    }

    case "SetDecorationVisibility":
      playerData.decorationVisibility = payload.payload;
      break;

    case "SetCosmeticLoadout":
      playerData.cosmeticLoadout = payload.payload;
      break;
  }

  targetSave.player = playerData;
  appendNonCriticalAudit(targetSave, user, ctx.ip, payload);

  targetSave.id = targetSave.savetime;
  targetSave.savetime = getCurrentDateTime();
  await postgres.em.persistAndFlush(targetSave);

  logger.info(
    `Non-critical save action '${payload.action}' persisted | userId=${user.userid} | baseId=${targetSave.baseid} | traceId=${randomUUID()}`
  );

  ctx.status = Status.OK;
  ctx.body = {
    ok: true,
    savedAt: new Date(targetSave.savetime * 1000).toISOString(),
  };
}

async function resolveTargetSave(user: User, userSave: Save, baseId: string): Promise<Save | null> {
  const normalized = baseId.trim().toLowerCase();
  if (
    normalized === "home" ||
    normalized === "self" ||
    normalized === "main" ||
    normalized === "default" ||
    normalized === "0"
  ) {
    return userSave;
  }

  return postgres.em.findOne(Save, {
    baseid: baseId,
    saveuserid: user.userid,
  });
}

function appendNonCriticalAudit(
  save: Save,
  user: User,
  ip: string,
  payload: z.infer<typeof NextClientBaseSaveSchema>
): void {
  const updates = Array.isArray(save.updates) ? [...save.updates] : [];
  updates.push({
    k: "nonCriticalAction",
    action: payload.action,
    at: payload.audit.at,
    clientVersion: payload.audit.clientVersion,
    userId: user.userid,
    ip,
    traceId: randomUUID(),
  });

  const MAX_AUDIT_ITEMS = 200;
  while (updates.length > MAX_AUDIT_ITEMS) {
    updates.shift();
  }

  save.updates = updates;
}

const updateOutposts = (
  userSave: Save,
  baseSave: Save,
  key: keyof FieldData
) => {
  if (key === SaveKeys.BUILDING_RESOURCES) {
    userSave.buildingresources[`b${baseSave.baseid}`] =
      baseSave.buildingresources[`b${baseSave.baseid}`];
    userSave.buildingresources["t"] = getCurrentDateTime();
  }

  if (key === SaveKeys.QUESTS) {
    userSave.quests = baseSave.quests;
  }
};

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
