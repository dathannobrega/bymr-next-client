import { nanoid } from "nanoid";
import type { TokenStore } from "../auth/tokenStore";
import type { ClientConfig } from "../config";
import {
  GetNewMapResponseSchema,
  InitRequestSchema,
  InitResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  type GetNewMapResponse,
  type InitResponse,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
} from "../contracts/compat";
import {
  CmdArgsByOperationSchema,
  CmdEnvelopeSchema,
  CmdResponseSchema,
  type CmdOperation,
  type CmdResponse,
  type CancelUpgradeArgs,
  type CollectHarvesterArgs,
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
import {
  ClientSafeErrorEnvelopeSchema,
  StructuredHttpErrorSchema,
} from "../contracts/http";
import { parseBaseLoadResponse } from "../base/baseLoad";
import {
  StateSnapshotQuerySchema,
  StateSnapshotResponseSchema,
  type StateSnapshotQuery,
  type StateSnapshotResponse,
} from "../contracts/state";
import {
  WorldmapActionResponseSchema,
  WorldmapV3GetCellsRequestSchema,
  WorldmapV3GetCellsResponseSchema,
  WorldmapV3InitResponseSchema,
  WorldmapV3RelocateResponseSchema,
  WorldmapV2TakeoverCellRequestSchema,
  WorldmapV2TransferAssetsRequestSchema,
  WorldmapSaveBookmarksRequestSchema,
  type WorldmapActionResponse,
  type WorldmapV2TakeoverCellRequest,
  type WorldmapV2TransferAssetsRequest,
  type WorldmapSaveBookmarksRequest,
  type WorldmapV3GetCellsRequest,
  type WorldmapV3GetCellsResponse,
  type WorldmapV3InitResponse,
  type WorldmapV3RelocateResponse,
} from "../contracts/maproom";
import {
  StateStreamDeltaPayloadSchema,
  StateStreamReadyPayloadSchema,
  StateStreamSnapshotPayloadSchema,
  StateStreamTickPayloadSchema,
  type StateStreamEvent,
} from "../contracts/stream";
import {
  CombatReplayFramePayloadSchema,
  CombatReplayReadyPayloadSchema,
  CombatReplayResultPayloadSchema,
  CombatReplaySnapshotPayloadSchema,
  CombatStartRequestSchema,
  CombatStartResponseSchema,
  type CombatReplayEvent,
  type CombatStartRequest,
  type CombatStartResponse,
} from "../contracts/combat";
import {
  AttackLogFilterSchema,
  SocialAttackLogsResponseSchema,
  SocialAvailableWorldsResponseSchema,
  SocialLeaderboardsResponseSchema,
  type AttackLogFilter,
  type SocialAttackLogsResponse,
  type SocialAvailableWorldsResponse,
  type SocialLeaderboardsResponse,
} from "../contracts/social";
import {
  GetMessageThreadRequestSchema,
  MessageActionResponseSchema,
  MessageTargetsResponseSchema,
  MessageThreadResponseSchema,
  MessageThreadsResponseSchema,
  ReportMessageThreadRequestSchema,
  SendMessageRequestSchema,
  type GetMessageThreadRequest,
  type MessageActionResponse,
  type MessageTargetsResponse,
  type MessageThreadResponse,
  type MessageThreadsResponse,
  type ReportMessageThreadRequest,
  type SendMessageRequest,
} from "../contracts/mail";

export type StateStreamHandlers = {
  onEvent: (event: StateStreamEvent) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
};

export type CombatReplayHandlers = {
  onEvent: (event: CombatReplayEvent) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
};

export type StateStreamSubscription = {
  close: () => void;
  closed: Promise<void>;
};

export class ApiClient {
  private seq = 0;

  constructor(
    private readonly config: ClientConfig,
    private readonly tokenStore: TokenStore
  ) {}

  async init(): Promise<InitResponse> {
    const body = InitRequestSchema.parse({
      apiVersion: this.config.apiVersion,
      runtime: detectRuntime(),
      platform: detectPlatform(),
      clientBuild: this.config.clientBuild,
    });
    const res = await this.requestJson("POST", "/init", body, { auth: false });
    return InitResponseSchema.parse(res);
  }

  async getNewMap(): Promise<GetNewMapResponse> {
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/bm/getnewmap`;
    const res = await this.requestJson("GET", path);
    return GetNewMapResponseSchema.parse(res);
  }

  async login(payload: LoginRequest): Promise<LoginResponse> {
    const body = LoginRequestSchema.parse(payload);
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/getinfo`;
    const res = await this.requestJson("POST", path, body, { auth: false });
    return LoginResponseSchema.parse(res);
  }

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const body = RegisterRequestSchema.parse(payload);
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/register`;
    const res = await this.requestJson("POST", path, body, { auth: false });
    return RegisterResponseSchema.parse(res);
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

  async cancelUpgrade(args: CancelUpgradeArgs): Promise<CmdResponse> {
    return this.cmd("CancelUpgrade", args);
  }

  async collectHarvester(args: CollectHarvesterArgs): Promise<CmdResponse> {
    return this.cmd("CollectHarvester", args);
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
    const normalized = parseBaseLoadResponse(res);
    return BaseLoadResponseSchema.parse(normalized);
  }

  async stateSnapshot(query: StateSnapshotQuery = {}): Promise<StateSnapshotResponse> {
    const normalizedQuery = StateSnapshotQuerySchema.parse(query);
    const suffix = buildStateQuerySuffix(normalizedQuery);
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/state${suffix ? `?${suffix}` : ""}`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return StateSnapshotResponseSchema.parse(res);
  }

  async worldmapInitV3(): Promise<WorldmapV3InitResponse> {
    const res = await this.requestJson("GET", "/worldmapv3/initworldmap", undefined, { auth: true });
    return WorldmapV3InitResponseSchema.parse(res);
  }

  async worldmapGetCellsV3(payload: WorldmapV3GetCellsRequest): Promise<WorldmapV3GetCellsResponse> {
    const body = WorldmapV3GetCellsRequestSchema.parse(payload);
    const res = await this.requestJson("POST", "/worldmapv3/getcells", body, { auth: true });
    return WorldmapV3GetCellsResponseSchema.parse(res);
  }

  async worldmapRelocateV3(): Promise<WorldmapV3RelocateResponse> {
    const res = await this.requestJson("POST", "/worldmapv3/relocate", {}, { auth: true });
    return WorldmapV3RelocateResponseSchema.parse(res);
  }

  async worldmapTakeoverCellV2(payload: WorldmapV2TakeoverCellRequest): Promise<WorldmapActionResponse> {
    const parsed = WorldmapV2TakeoverCellRequestSchema.parse(payload);
    const body: Record<string, unknown> = { baseid: parsed.baseId };

    if (parsed.shiny !== undefined) {
      body.shiny = String(parsed.shiny);
    }

    if (parsed.resources) {
      body.resources = JSON.stringify(parsed.resources);
    }

    const res = await this.requestJson("POST", "/worldmapv2/takeoverCell", body, { auth: true });
    return WorldmapActionResponseSchema.parse(res);
  }

  async worldmapTransferAssetsV2(
    payload: WorldmapV2TransferAssetsRequest
  ): Promise<WorldmapActionResponse> {
    const parsed = WorldmapV2TransferAssetsRequestSchema.parse(payload);
    const body = {
      frombaseid: parsed.fromBaseId,
      tobaseid: parsed.toBaseId,
      monsters: JSON.stringify([parsed.fromMonsters, parsed.toMonsters]),
    };

    const res = await this.requestJson("POST", "/worldmapv2/transferassets", body, { auth: true });
    return WorldmapActionResponseSchema.parse(res);
  }

  async saveMaproomBookmarks(payload: WorldmapSaveBookmarksRequest): Promise<WorldmapActionResponse> {
    const parsed = WorldmapSaveBookmarksRequestSchema.parse(payload);
    const body = {
      bookmarks: JSON.stringify(parsed.bookmarks),
    };
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/savebookmarks`;
    const res = await this.requestJson("POST", path, body, { auth: true });
    return WorldmapActionResponseSchema.parse(res);
  }

  async getAvailableWorlds(): Promise<SocialAvailableWorldsResponse> {
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/worlds`;
    const res = await this.requestJson("GET", path, undefined, { auth: false });
    return SocialAvailableWorldsResponseSchema.parse(res);
  }

  async getLeaderboards(worldId: string): Promise<SocialLeaderboardsResponse> {
    const normalizedWorldId = worldId.trim();
    if (!normalizedWorldId) {
      throw new Error("World id is required for leaderboards");
    }

    const query = new URLSearchParams({ worldid: normalizedWorldId }).toString();
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/leaderboards?${query}`;
    const res = await this.requestJson("GET", path, undefined, { auth: false });
    return SocialLeaderboardsResponseSchema.parse(res);
  }

  async getAttackLogs(filter: AttackLogFilter = "both"): Promise<SocialAttackLogsResponse> {
    const normalizedFilter = AttackLogFilterSchema.parse(filter);
    const query = new URLSearchParams({ filter: normalizedFilter }).toString();
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/attacklogs?${query}`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return SocialAttackLogsResponseSchema.parse(res);
  }

  async getMessageTargets(): Promise<MessageTargetsResponse> {
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/getmessagetargets`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return MessageTargetsResponseSchema.parse(res);
  }

  async getMessageThreads(): Promise<MessageThreadsResponse> {
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/getmessagethreads`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return MessageThreadsResponseSchema.parse(res);
  }

  async getMessageThread(payload: GetMessageThreadRequest): Promise<MessageThreadResponse> {
    const parsed = GetMessageThreadRequestSchema.parse(payload);
    const body = {
      threadid: String(parsed.threadId),
    };
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/getmessagethread`;
    const res = await this.requestJson("POST", path, body, { auth: true });
    return MessageThreadResponseSchema.parse(res);
  }

  async sendMessage(payload: SendMessageRequest): Promise<MessageActionResponse> {
    const parsed = SendMessageRequestSchema.parse(payload);
    const body: Record<string, string> = {
      subject: parsed.subject,
      type: parsed.type,
      message: parsed.message,
      targetid: String(parsed.targetUserId),
      threadid: String(parsed.threadId),
      targetbaseid: parsed.targetBaseId,
    };

    if (parsed.baseId) {
      body.baseid = parsed.baseId;
    }

    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/sendmessage`;
    const res = await this.requestJson("POST", path, body, { auth: true });
    return MessageActionResponseSchema.parse(res);
  }

  async reportMessageThread(payload: ReportMessageThreadRequest): Promise<MessageActionResponse> {
    const parsed = ReportMessageThreadRequestSchema.parse(payload);
    const body = {
      threadid: String(parsed.threadId),
      reason: parsed.reason,
    };
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/player/reportmessagethread`;
    const res = await this.requestJson("POST", path, body, { auth: true });
    return MessageActionResponseSchema.parse(res);
  }

  async startCombatReplay(payload: CombatStartRequest): Promise<CombatStartResponse> {
    const body = CombatStartRequestSchema.parse(payload);
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/combat/start`;
    const res = await this.requestJson("POST", path, body, { auth: true });
    return CombatStartResponseSchema.parse(res);
  }

  openCombatReplay(
    replayId: string,
    handlers: CombatReplayHandlers,
    opts?: { speed?: "realtime" | "fast"; fromTick?: number }
  ): StateStreamSubscription {
    const replayIdSafe = replayId.trim();
    if (!replayIdSafe) {
      throw new Error("Missing replayId for combat replay stream");
    }

    const controller = new AbortController();

    const closed = this.consumeCombatReplayStream(replayIdSafe, handlers, controller.signal, opts)
      .catch((err) => {
        if (controller.signal.aborted) return;
        handlers.onError?.(asError(err));
      });

    return {
      close: () => controller.abort(),
      closed,
    };
  }

  openStateStream(query: StateSnapshotQuery = {}, handlers: StateStreamHandlers): StateStreamSubscription {
    const normalizedQuery = StateSnapshotQuerySchema.parse(query);
    const controller = new AbortController();

    const closed = this.consumeStateStream(normalizedQuery, handlers, controller.signal)
      .catch((err) => {
        if (controller.signal.aborted) return;
        handlers.onError?.(asError(err));
      });

    return {
      close: () => controller.abort(),
      closed,
    };
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
      const rawToken = await this.tokenStore.get();
      const token = normalizeBearerToken(rawToken);
      if (!token) {
        if (rawToken !== null) {
          await this.tokenStore.set(null);
        }
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
      const fallback = `HTTP ${res.status} ${res.statusText}`;
      throw new Error(toHttpErrorMessage(data, method, path, fallback));
    }

    return data;
  }

  private async consumeStateStream(
    query: StateSnapshotQuery,
    handlers: StateStreamHandlers,
    signal: AbortSignal
  ): Promise<void> {
    const suffix = buildStateQuerySuffix(query);
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/stream${suffix ? `?${suffix}` : ""}`;

    const url = new URL(path, this.config.baseUrl);
    this.assertAllowedOrigin(url.origin);

    const rawToken = await this.tokenStore.get();
    const token = normalizeBearerToken(rawToken);
    if (!token) {
      if (rawToken !== null) {
        await this.tokenStore.set(null);
      }
      throw new Error(`Missing auth token (GET ${path})`);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!res.ok) {
      throw await createHttpError(res, "GET", path);
    }

    if (!res.body) {
      throw new Error(`Missing event stream body (GET ${path})`);
    }

    handlers.onOpen?.();

    await readSseStream(res.body, (eventName, payload) => {
      const event = parseStateStreamEvent(eventName, payload);
      if (event) {
        handlers.onEvent(event);
      }
    }, signal);
  }

  private async consumeCombatReplayStream(
    replayId: string,
    handlers: CombatReplayHandlers,
    signal: AbortSignal,
    opts?: { speed?: "realtime" | "fast"; fromTick?: number }
  ): Promise<void> {
    const params = new URLSearchParams();
    if (opts?.speed) {
      params.set("speed", opts.speed);
    }
    if (typeof opts?.fromTick === "number" && Number.isFinite(opts.fromTick) && opts.fromTick > 0) {
      params.set("fromTick", String(Math.trunc(opts.fromTick)));
    }

    const suffix = params.toString();
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/combat/replay/${encodeURIComponent(replayId)}${
      suffix ? `?${suffix}` : ""
    }`;

    const url = new URL(path, this.config.baseUrl);
    this.assertAllowedOrigin(url.origin);

    const rawToken = await this.tokenStore.get();
    const token = normalizeBearerToken(rawToken);
    if (!token) {
      if (rawToken !== null) {
        await this.tokenStore.set(null);
      }
      throw new Error(`Missing auth token (GET ${path})`);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!res.ok) {
      throw await createHttpError(res, "GET", path);
    }

    if (!res.body) {
      throw new Error(`Missing event stream body (GET ${path})`);
    }

    handlers.onOpen?.();

    await readSseStream(
      res.body,
      (eventName, payload) => {
        const event = parseCombatReplayEvent(eventName, payload);
        if (event) {
          handlers.onEvent(event);
        }
      },
      signal
    );
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

function normalizeBearerToken(token: string | null): string | null {
  if (!token) return null;
  const normalized = token.trim();
  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return null;
  return normalized;
}

function buildStateQuerySuffix(query: StateSnapshotQuery): string {
  const params = new URLSearchParams();
  if (query.baseId) {
    params.set("baseId", query.baseId);
  }
  if (query.scope) {
    params.set("scope", query.scope);
  }
  return params.toString();
}

async function createHttpError(
  res: Response,
  method: "GET" | "POST",
  path: string
): Promise<Error> {
  const text = await res.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  const fallback = `HTTP ${res.status} ${res.statusText}`;
  return new Error(toHttpErrorMessage(data, method, path, fallback));
}

type ParsedHttpErrorPayload = {
  error: string;
  code?: string;
  traceId?: string;
  issue?: string;
};

function toHttpErrorMessage(
  data: unknown,
  method: "GET" | "POST",
  path: string,
  fallback: string
): string {
  const parsed = parseHttpErrorPayload(data);
  if (!parsed) {
    return `${fallback} (${method} ${path})`;
  }

  const suffix = [
    parsed.code ? `code=${parsed.code}` : null,
    parsed.traceId ? `traceId=${parsed.traceId}` : null,
    parsed.issue ? `issue=${parsed.issue}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `${parsed.error}${suffix ? ` (${suffix})` : ""} (${method} ${path})`;
}

function parseHttpErrorPayload(data: unknown): ParsedHttpErrorPayload | null {
  const clientSafe = ClientSafeErrorEnvelopeSchema.safeParse(data);
  if (clientSafe.success && clientSafe.data.errorDetails) {
    const envelope = clientSafe.data;
    const code = envelope.errorDetails?.data?.code ?? envelope.errorDetails?.code;
    const traceId = envelope.errorDetails?.traceId;
    const issueCandidate = envelope.errorDetails?.data?.issues?.[0];
    const issue =
      issueCandidate && issueCandidate !== envelope.error
        ? issueCandidate
        : undefined;

    return {
      error: envelope.error,
      ...(code ? { code } : {}),
      ...(traceId ? { traceId } : {}),
      ...(issue ? { issue } : {}),
    };
  }

  const structured = StructuredHttpErrorSchema.safeParse(data);
  if (structured.success) {
    return {
      error: structured.data.error,
      ...(structured.data.code ? { code: structured.data.code } : {}),
      ...(structured.data.traceId ? { traceId: structured.data.traceId } : {}),
    };
  }

  const rawError = asRecord(data)?.error;
  if (typeof rawError === "string" && rawError.trim().length > 0) {
    return { error: rawError };
  }

  return null;
}

async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (eventName: string, payload: unknown) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];

  const dispatchEvent = () => {
    if (dataLines.length === 0) {
      eventName = "message";
      return;
    }

    const raw = dataLines.join("\n");
    const parsed = safeParseJson(raw);
    if (parsed !== undefined) {
      onEvent(eventName, parsed);
    }

    eventName = "message";
    dataLines = [];
  };

  const processLine = (rawLine: string) => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.length === 0) {
      dispatchEvent();
      return;
    }

    if (line.startsWith(":")) {
      return;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    const value = separatorIndex >= 0
      ? line.slice(separatorIndex + 1).replace(/^ /, "")
      : "";

    if (field === "event") {
      eventName = value || "message";
      return;
    }

    if (field === "data") {
      dataLines.push(value);
    }
  };

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        processLine(line);
        newlineIndex = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();
    if (buffer.length > 0) {
      processLine(buffer);
    }
    dispatchEvent();
  } finally {
    reader.releaseLock();
  }
}

function parseStateStreamEvent(eventName: string, payload: unknown): StateStreamEvent | null {
  if (eventName === "ready") {
    return { type: "ready", payload: StateStreamReadyPayloadSchema.parse(payload) };
  }

  if (eventName === "snapshot") {
    return { type: "snapshot", payload: StateStreamSnapshotPayloadSchema.parse(payload) };
  }

  if (eventName === "delta") {
    return { type: "delta", payload: StateStreamDeltaPayloadSchema.parse(payload) };
  }

  if (eventName === "tick") {
    return { type: "tick", payload: StateStreamTickPayloadSchema.parse(payload) };
  }

  return null;
}

function parseCombatReplayEvent(eventName: string, payload: unknown): CombatReplayEvent | null {
  if (eventName === "ready") {
    return { type: "ready", payload: CombatReplayReadyPayloadSchema.parse(payload) };
  }

  if (eventName === "snapshot") {
    return { type: "snapshot", payload: CombatReplaySnapshotPayloadSchema.parse(payload) };
  }

  if (eventName === "frame") {
    return { type: "frame", payload: CombatReplayFramePayloadSchema.parse(payload) };
  }

  if (eventName === "result") {
    return { type: "result", payload: CombatReplayResultPayloadSchema.parse(payload) };
  }

  return null;
}

function safeParseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}


function detectRuntime(): "web" | "desktop" {
  if (typeof window === "undefined") return "web";
  return "__TAURI_INTERNALS__" in window ? "desktop" : "web";
}

function detectPlatform(): "windows" | "macos" | "linux" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";

  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  const normalized = platform.toLowerCase();

  if (normalized.includes("mac")) return "macos";
  if (normalized.includes("win")) return "windows";
  if (normalized.includes("linux")) return "linux";

  return "unknown";
}
