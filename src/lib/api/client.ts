import type { ClientConfig } from "../config";
import { InitResponseSchema, GetNewMapResponseSchema, type InitResponse, type GetNewMapResponse } from "./types";
import type { TokenStore } from "../auth/tokenStore";

export class ApiClient {
  constructor(
    private readonly config: ClientConfig,
    private readonly tokenStore: TokenStore
  ) {}

  async init(): Promise<InitResponse> {
    // Current server expects POST /init
    const res = await this.requestJson("POST", "/init", {
      apiVersion: this.config.apiVersion,
    }, { auth: false });

    return InitResponseSchema.parse(res);
  }

  async getNewMap(): Promise<GetNewMapResponse> {
    // Current server supports GET/POST on /api/:apiVersion/bm/getnewmap
    const path = `/api/${encodeURIComponent(this.config.apiVersion)}/bm/getnewmap`;
    const res = await this.requestJson("GET", path, undefined, { auth: true });
    return GetNewMapResponseSchema.parse(res);
  }

  async baseLoad(payload: Record<string, unknown>): Promise<unknown> {
    // Current server expects POST /base/load (and inferno variant).
    return this.requestJson("POST", "/base/load", payload, { auth: true });
  }

  async baseSave(payload: Record<string, unknown>): Promise<unknown> {
    // Current server expects POST /base/save (and inferno variant).
    return this.requestJson("POST", "/base/save", payload, { auth: true });
  }

  // ---- core helpers

  private async requestJson(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts?: { auth?: boolean }
  ): Promise<any> {
    const url = new URL(path, this.config.baseUrl).toString();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    const useAuth = opts?.auth ?? true;
    if (useAuth) {
      const token = await this.tokenStore.get();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let fetchOpts: RequestInit = { method, headers };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      fetchOpts = { ...fetchOpts, body: JSON.stringify(body ?? {}) };
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();

    // Most endpoints return JSON; keep robust for debugging.
    let data: any;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = typeof data?.error === "string" ? data.error : `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`${msg} (${method} ${path})`);
    }

    return data;
  }
}
