import z from "zod";
import { randomUUID } from "node:crypto";

import { devConfig } from "../../../config/DevSettings.js";
import { Save } from "../../../models/save.model.js";
import { postgres } from "../../../server.js";
import type { KoaController } from "../../../utils/KoaController.js";
import { storeItems } from "../../../data/store/storeItems.js";
import { User } from "../../../models/user.model.js";
import { FilterFrontendKeys } from "../../../utils/FrontendKey.js";
import { getFlags } from "../../../data/flags.js";
import { getCurrentDateTime } from "../../../utils/getCurrentDateTime.js";
import { BaseMode, BaseType } from "../../../enums/Base.js";
import { WORLD_SIZE } from "../../../config/WorldGenSettings.js";
import { Status } from "../../../enums/StatusCodes.js";
import { baseModeView } from "./modes/baseModeView.js";
import { baseModeBuild } from "./modes/baseModeBuild.js";
import { logger } from "../../../utils/logger.js";
import { baseModeAttack } from "./modes/baseModeAttack.js";
import { mapUserSaveData } from "../mapUserSaveData.js";
import { infernoModeDescent } from "./modes/infernoModeDescent.js";
import { infernoModeView } from "./modes/infernoModeView.js";
import { infernoModeAttack } from "./modes/infernoModeAttack.js";
import { infernoModeBuild } from "./modes/infernoModeBuild.js";
import { validateAttack } from "../../../services/maproom/validateAttack.js";
import { BaseLoadSchema } from "../../../zod/BaseLoadSchema.js";
import { discordAgeErr } from "../../../errors/errors.js";
import {
  YARD_HEIGHT,
  YARD_WIDTH,
  deriveYardTheme,
  toNormalizedBuildings,
  toResourceSummary,
} from "../../../services/state/normalizeState.js";
import { applyLegacyBuildingProgress } from "../../../services/state/applyLegacyBuildingProgress.js";
import {
  applyLegacyAcademyProgress,
  buildAcademyStateSummary,
} from "../../../services/state/academyState.js";

const NextClientBaseLoadSchema = z.object({
  baseId: z.string().min(1),
  mode: z.enum(["view", "build"]),
});

const TRUE_LIKE_VALUES = new Set(["1", "true", "yes", "enabled"]);

type ParsedLoadRequest = {
  baseid: string;
  type: string;
  attackData?: unknown;
  nextClient: boolean;
};

/**
 * Controller responsible for loading base modes based on the user's request.
 *
 * @param {Context} ctx - The Koa context object.
 * @returns {Promise<void>} A promise that resolves when the base load process is complete.
 * @throws Will throw an error if the base load process fails.
 */
export const baseLoad: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  await postgres.em.populate(user, ["save", "infernosave"]);

  try {
    const parsedRequest = parseLoadRequest(ctx.request.body, user);
    if (parsedRequest.nextClient && isNextClientBaseLoadDeprecated()) {
      respondNextClientBaseLoadDeprecated(ctx, user, parsedRequest.baseid);
      return;
    }

    const { baseid, type, attackData } = parsedRequest;

    let baseSave: Save = null;

    switch (type) {
      case BaseMode.BUILD:
        baseSave = await baseModeBuild(user, baseid);
        break;

      case BaseMode.VIEW:
      case BaseMode.IVIEW:
        baseSave = await baseModeView(baseid);
        break;

      case BaseMode.ATTACK:
        if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();

        await validateAttack(user, attackData);
        baseSave = await baseModeAttack(user, baseid);
        break;

      case BaseMode.IDESCENT:
        baseSave = await infernoModeDescent(user);
        break;

      case BaseMode.IBUILD:
        baseSave = await infernoModeBuild(user);
        break;

      case BaseMode.IWMVIEW:
        baseSave = await infernoModeView(user, baseid);
        break;

      case BaseMode.IATTACK:
        if (!ctx.meetsDiscordAgeCheck) throw discordAgeErr();

        await validateAttack(user, attackData);
        baseSave = await infernoModeAttack(user, baseid);
        break;

      case BaseMode.IWMATTACK:
        await validateAttack(user, attackData);
        baseSave = await infernoModeAttack(user, baseid);
        break;
        
      default:
        throw new Error(`Base type not handled, type: ${type}.`);
    }

    applyLegacyBuildingProgress(baseSave);
    applyLegacyAcademyProgress(baseSave);

    if (parsedRequest.nextClient) {
      ctx.status = Status.OK;
      ctx.body = toNextClientBaseLoad(baseSave);
      return;
    }

    const filteredSave = FilterFrontendKeys(baseSave);
    const isTutorialEnabled = devConfig.skipTutorial
      ? 205
      : filteredSave.tutorialstage;

    const flags = getFlags();
    flags.discordOldEnough = ctx.meetsDiscordAgeCheck;

    const responseBody = {
      ...filteredSave,
      flags,
      worldsize: WORLD_SIZE,
      error: 0,
      id: filteredSave.basesaveid,
      champion: JSON.stringify(filteredSave.champion),
      storeitems: { ...storeItems },
      tutorialstage: isTutorialEnabled,
      currenttime: getCurrentDateTime(),
      pic_square: `${process.env.AVATAR_URL}?seed=${
        filteredSave.name
      }&size=${50}`,
    };

    // Only include user save data if the base belongs to the current user
    // and is not an inferno base
    if (
      baseSave.type !== BaseType.INFERNO &&
      user.userid === filteredSave.userid
    ) {
      Object.assign(responseBody, mapUserSaveData(user));
    }

    ctx.status = Status.OK;
    ctx.body = responseBody;
  } catch (err) {
    if (err instanceof z.ZodError) {
      ctx.status = Status.BAD_REQUEST;
      ctx.body = {
        error: "Invalid base load payload.",
        details: err.issues.map((issue) => issue.message),
      };
      return;
    }

    ctx.status = Status.INTERNAL_SERVER_ERROR;
    ctx.body = { error: "The server failed to load this base." };
    logger.error(
      `Failed to load base | userId=${user.userid} | baseId=${String((ctx.request.body as { baseId?: unknown })?.baseId ?? "unknown")} | error=${formatError(err)}`
    );
  }
};

function isNextClientBaseLoadDeprecated(): boolean {
  const rawValue = process.env.DISABLE_NEXT_CLIENT_BASE_LOAD?.trim().toLowerCase();
  if (!rawValue) return false;
  return TRUE_LIKE_VALUES.has(rawValue);
}

function respondNextClientBaseLoadDeprecated(
  ctx: Parameters<KoaController>[0],
  user: User,
  baseId: string
): void {
  const traceId = randomUUID();
  logger.info(
    `event=base_load userId=${user.userid} ip=${ctx.ip} baseId=${baseId} result=rejected code=NEXT_CLIENT_BASE_LOAD_DEPRECATED traceId=${traceId}`
  );

  ctx.status = Status.CONFLICT;
  ctx.body = {
    error: "Endpoint /base/load is deprecated for next-client. Use /api/:apiVersion/state.",
    code: "NEXT_CLIENT_BASE_LOAD_DEPRECATED",
    traceId,
    details: {
      baseId,
      migrationPath: "/api/:apiVersion/state",
      flag: "DISABLE_NEXT_CLIENT_BASE_LOAD",
    },
  };
}

function parseLoadRequest(rawBody: unknown, user: User): ParsedLoadRequest {
  const nextClient = NextClientBaseLoadSchema.safeParse(rawBody);
  if (nextClient.success) {
    const resolvedBaseId = resolveBaseId(nextClient.data.baseId, user);
    const resolvedType =
      !user.save && resolvedBaseId === BaseMode.DEFAULT
        ? BaseMode.BUILD
        : nextClient.data.mode === "build"
          ? BaseMode.BUILD
          : BaseMode.VIEW;

    return {
      baseid: resolvedBaseId,
      type: resolvedType,
      nextClient: true,
    };
  }

  const legacy = BaseLoadSchema.parse(rawBody);
  return {
    baseid: legacy.baseid,
    type: legacy.type,
    attackData: legacy.attackData,
    nextClient: false,
  };
}

function resolveBaseId(baseId: string, user: User): string {
  const normalized = baseId.trim().toLowerCase();
  if (
    normalized === "home" ||
    normalized === "self" ||
    normalized === "main" ||
    normalized === "default" ||
    normalized === "0"
  ) {
    return user.save?.baseid ?? BaseMode.DEFAULT;
  }

  return baseId;
}

function toNextClientBaseLoad(save: Save) {
  const buildings = toNormalizedBuildings(save, {
    yardWidth: YARD_WIDTH,
    yardHeight: YARD_HEIGHT,
  });
  const resources = toResourceSummary(save.resources);
  return {
    yardWidth: YARD_WIDTH,
    yardHeight: YARD_HEIGHT,
    yardTheme: deriveYardTheme(save),
    buildings,
    resources,
    academy: buildAcademyStateSummary(save),
  };
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
