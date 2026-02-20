import z from "zod";

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
import { coerceBuildingTypeFromRecord } from "../../../utils/buildingType.js";
import { getLegacyFootprintTilesByCode } from "../../../utils/buildingFootprint.js";

const YARD_WIDTH = 20;
const YARD_HEIGHT = 14;

const NextClientBaseLoadSchema = z.object({
  baseId: z.string().min(1),
  mode: z.enum(["view", "build"]),
});

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
  const buildings = toNextClientBuildings(save);
  const resources = toResourceSummary(save.resources);
  return {
    yardWidth: YARD_WIDTH,
    yardHeight: YARD_HEIGHT,
    yardTheme: deriveYardTheme(save),
    buildings,
    resources,
  };
}

function toNextClientBuildings(save: Save): Array<{
  id: string;
  type: string;
  x: number;
  y: number;
  level?: number;
  footprintW?: number;
  footprintH?: number;
  countdownUpgrade?: number;
  upgradeToLevel?: number;
}> {
  const buildingData = asRecord(save.buildingdata) ?? {};
  const out: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    level?: number;
    footprintW?: number;
    footprintH?: number;
    countdownUpgrade?: number;
    upgradeToLevel?: number;
  }> = [];

  for (const [key, value] of Object.entries(buildingData)) {
    const raw = asRecord(value);
    if (!raw) continue;

    const x = parseIntSafe(raw.x ?? raw.X, Number.NaN);
    const y = parseIntSafe(raw.y ?? raw.Y, Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || y < 0 || x >= YARD_WIDTH || y >= YARD_HEIGHT) continue;

    const id = String(raw.id ?? key);
    const type = coerceBuildingTypeFromRecord(raw.type, raw.t);
    const typeCode = parseIntSafe(raw.t, Number.NaN);
    const defaultFootprint = getLegacyFootprintTilesByCode(
      Number.isFinite(typeCode) ? typeCode : undefined
    );
    const footprintWRaw = parseIntSafe(raw.footprintW ?? raw.fw, Number.NaN);
    const footprintHRaw = parseIntSafe(raw.footprintH ?? raw.fh, Number.NaN);
    const footprintW =
      Number.isFinite(footprintWRaw) && footprintWRaw > 0
        ? footprintWRaw
        : defaultFootprint.width;
    const footprintH =
      Number.isFinite(footprintHRaw) && footprintHRaw > 0
        ? footprintHRaw
        : defaultFootprint.height;

    const levelRaw = parseIntSafe(raw.level ?? raw.l, Number.NaN);
    const level = Number.isFinite(levelRaw) && levelRaw > 0 ? levelRaw : undefined;
    const countdownUpgradeRaw = parseIntSafe(raw.countdownUpgrade ?? raw.cU, Number.NaN);
    const countdownUpgrade =
      Number.isFinite(countdownUpgradeRaw) && countdownUpgradeRaw > 0
        ? countdownUpgradeRaw
        : undefined;
    const upgradeToLevelRaw = parseIntSafe(raw.upgradeToLevel, Number.NaN);
    const upgradeToLevel =
      Number.isFinite(upgradeToLevelRaw) && upgradeToLevelRaw > 0
        ? upgradeToLevelRaw
        : undefined;

    out.push({
      id,
      type,
      x,
      y,
      ...(level !== undefined ? { level } : {}),
      ...(footprintW > 1 ? { footprintW } : {}),
      ...(footprintH > 1 ? { footprintH } : {}),
      ...(countdownUpgrade !== undefined ? { countdownUpgrade } : {}),
      ...(upgradeToLevel !== undefined ? { upgradeToLevel } : {}),
    });
  }

  return out;
}

function toResourceSummary(resources: unknown): Record<string, number> {
  const value = asRecord(resources) ?? {};
  return {
    r1: parseIntSafe(value.r1, 0),
    r2: parseIntSafe(value.r2, 0),
    r3: parseIntSafe(value.r3, 0),
    r4: parseIntSafe(value.r4, 0),
    r1max: parseIntSafe(value.r1max, 10000),
    r2max: parseIntSafe(value.r2max, 10000),
    r3max: parseIntSafe(value.r3max, 10000),
    r4max: parseIntSafe(value.r4max, 10000),
  };
}

function deriveYardTheme(save: Save): "grass" | "sand" | "lava" | "rock" | "crater" {
  switch (save.type) {
    case BaseType.INFERNO:
    case BaseType.INFERNO_TRIBE:
      return "lava";
    case BaseType.OUTPOST:
      return "sand";
    case BaseType.TRIBE:
      return "rock";
    default:
      return "grass";
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
