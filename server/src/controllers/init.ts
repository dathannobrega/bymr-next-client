import z from "zod";
import { devConfig } from "../config/DevSettings.js";
import { Status } from "../enums/StatusCodes.js";
import type { KoaController } from "../utils/KoaController.js";
import { getApiVersion } from "../server.js";

export const InitSchema = z.object({
  apiVersion: z.string().optional(),
  runtime: z.enum(["web", "desktop"]).optional(),
  platform: z.enum(["windows", "macos", "linux", "unknown"]).optional(),
  clientBuild: z.string().optional(),
});

export const init: KoaController = async (ctx) => {
  const { apiVersion, runtime, platform, clientBuild } = InitSchema.parse(ctx.request.body);
  const expectedVersion = getApiVersion();
  const requiredClientBuild = process.env.REQUIRED_CLIENT_BUILD?.trim() || undefined;
  const downloadUrl = process.env.CLIENT_DOWNLOAD_URL?.trim() || undefined;
  const canonicalStateRequired = isTrueLike(process.env.REQUIRE_NEXT_CLIENT_CANONICAL_STATE)
    || isTrueLike(process.env.DISABLE_NEXT_CLIENT_BASE_LOAD);

  const buildMismatch = Boolean(requiredClientBuild && clientBuild !== requiredClientBuild);
  const invalidVersion = !apiVersion || apiVersion !== expectedVersion || buildMismatch;

  if (invalidVersion) {
    const error = `Please update to the latest version. Visit our downloads page to get the latest client.`;
    ctx.status = Status.UPGRADE_REQUIRED;
    ctx.body = {
      error,
      code: "VERSION_MISMATCH",
      versionMismatch: true,
      requiredClientBuild,
      downloadUrl,
      protocol: {
        canonicalStateRequired,
        legacyBaseLoadFallbackAllowed: !canonicalStateRequired,
        stateStreamRequired: canonicalStateRequired,
      },
      received: {
        apiVersion,
        runtime,
        platform,
        clientBuild,
      },
    };
    return;
  }

  ctx.status = Status.OK;
  ctx.body = {
    debugMode: devConfig.debugMode,
    requiredClientBuild,
    downloadUrl,
    versionMismatch: false,
    protocol: {
      canonicalStateRequired,
      legacyBaseLoadFallbackAllowed: !canonicalStateRequired,
      stateStreamRequired: canonicalStateRequired,
    },
  };
};

function isTrueLike(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1"
    || normalized === "true"
    || normalized === "yes"
    || normalized === "enabled";
}
