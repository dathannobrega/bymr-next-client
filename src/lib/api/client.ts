import type { ClientConfig } from "../config";
import { InitRequestSchema, InitResponseSchema, GetNewMapResponseSchema, type InitResponse, type GetNewMapResponse } from "../contracts/compat";
import type { TokenStore } from "../auth/tokenStore";

export class ApiClient {
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

  async baseLoad(payload: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", "/base/load", payload, { auth: true });
  }

  async baseSave(payload: Record<string, unknown>): Promise<unknown> {
    return this.requestJson("POST", "/base/save", payload, { auth: true });
  }

  private async requestJson(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts?: { auth?: boolean }
  ): Promise<unknown> {
    const url = new URL(path, this.config.baseUrl).toString();
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const useAuth = opts?.auth ?? true;
    if (useAuth) {
      const token = await this.tokenStore.get();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let fetchOpts: RequestInit = { method, headers };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchOpts = { ...fetchOpts, body: JSON.stringify(body ?? {}) };
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = asRecord(data)?.error;
      const msg = typeof err === "string" ? err : `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`${msg} (${method} ${path})`);
    }

    return data;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}
