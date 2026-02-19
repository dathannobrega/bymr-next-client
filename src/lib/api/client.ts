import { nanoid } from "nanoid";
import type { TokenStore } from "../auth/tokenStore";
import type { ClientConfig } from "../config";
import {
  GetNewMapResponseSchema,
  InitRequestSchema,
  InitResponseSchema,
  type GetNewMapResponse,
  type InitResponse,
} from "../contracts/compat";
import {
  CmdArgsByOperationSchema,
  CmdEnvelopeSchema,
  CmdResponseSchema,
  type CmdOperation,
  type CmdResponse,
  type MoveBuildingArgs,
  type PlaceBuildingArgs,
  type UpgradeBuildingArgs,
} from "../contracts/cmd";
import {
  BaseLoadRequestSchema,
  BaseLoadResponseSchema,
  BaseSaveRequestSchema,
  BaseSaveResponseSchema,
  type BaseLoadResponse,
  type BaseSaveResponse,
  type NonCriticalBaseSaveAction,
} from "../contracts/base";
import { StructuredHttpErrorSchema } from "../contracts/http";

export class ApiClient {
  private seq = 0;

  constructor(
    private readonly config: ClientConfig,
    private readonly tokenStore: TokenStore
  ) {}

  async init(): Promise<InitResponse> {
    const body = InitRequestSchema.parse({ apiVersion: this.config.apiVersion });
    const res = await this.requestJson("POST", "/init", body, { auth: false });
    return InitResponseSchema.parse(res);
  }

  async getNewMap(): Promise<GetNewMapResponse> {
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/bm/getnewmap`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return GetNewMapResponseSchema.parse(res);
  }

  async placeBuilding(args: PlaceBuildingArgs): Promise<CmdResponse> {
    return this.cmd("PlaceBuilding", args);
  }

  async moveBuilding(args: MoveBuildingArgs): Promise<CmdResponse> {
    return this.cmd("MoveBuilding", args);
  }

  async upgradeBuilding(args: UpgradeBuildingArgs): Promise<CmdResponse> {
    return this.cmd("UpgradeBuilding", args);
  }

  async cmd(op: CmdOperation, args: Record<string, unknown>): Promise<CmdResponse> {
    CmdArgsByOperationSchema.parse({ op, args });

    this.seq += 1;
    const envelope = CmdEnvelopeSchema.parse({
      op,
      args,
      seq: this.seq,
      idempotencyKey: nanoid(),
    });

    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/cmd`;
    const res = await this.requestJson("POST", path, envelope, { auth: true });
    return CmdResponseSchema.parse(res);
  }

  async baseLoad(baseId: string, mode: "view" | "build"): Promise<BaseLoadResponse> {
    const payload = BaseLoadRequestSchema.parse({ baseId, mode });
    const res = await this.requestJson("POST", "/base/load", payload, { auth: true });
    return BaseLoadResponseSchema.parse(res);
  }

  async baseSaveNonCritical(
    baseId: string,
    action: NonCriticalBaseSaveAction,
    payload: Record<string, unknown>
  ): Promise<BaseSaveResponse> {
    const body = BaseSaveRequestSchema.parse({
      baseId,
      action,
      payload,
      audit: {
        action,
        at: new Date().toISOString(),
        clientVersion: this.config.apiVersion,
      },
    });

    const res = await this.requestJson("POST", "/base/save", body, {
      auth: true,
      extraHeaders: {
        "X-BYMR-Action-Class": "non-critical",
      },
    });
    return BaseSaveResponseSchema.parse(res);
  }

  private async requestJson(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; extraHeaders?: Record<string, string> }
  ): Promise<unknown> {
    const url = new URL(path, this.config.baseUrl);
    this.assertAllowedOrigin(url.origin);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(opts?.extraHeaders ?? {}),
    };

    const useAuth = opts?.auth ?? true;
    if (useAuth) {
      const token = await this.tokenStore.get();
      if (!token) {
        throw new Error(`Missing auth token (${method} ${path})`);
      }
      headers.Authorization = `Bearer ${token}`;
    }

    let fetchOpts: RequestInit = { method, headers };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchOpts = { ...fetchOpts, body: JSON.stringify(body ?? {}) };
    }

    const res = await fetch(url.toString(), fetchOpts);
    const text = await res.text();

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const parsed = StructuredHttpErrorSchema.safeParse(data);
      if (parsed.success) {
        const { error, code, traceId } = parsed.data;
        const suffix = [code ? `code=${code}` : null, traceId ? `traceId=${traceId}` : null]
          .filter(Boolean)
          .join(" ");
        throw new Error(`${error}${suffix ? ` (${suffix})` : ""} (${method} ${path})`);
      }

      const err = asRecord(data)?.error;
      const msg = typeof err === "string" ? err : `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`${msg} (${method} ${path})`);
    }

    return data;
  }

  private assertAllowedOrigin(origin: string): void {
    const allowed = this.config.allowedConnectOrigins;
    if (!allowed || allowed.length === 0) return;
    if (!allowed.includes(origin)) {
      throw new Error(`Blocked request to non-allowlisted origin: ${origin}`);
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
