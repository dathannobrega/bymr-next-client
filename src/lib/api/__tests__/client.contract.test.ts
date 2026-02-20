import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../client";
import { MemoryTokenStore } from "../../auth/tokenStore";

const config = {
  baseUrl: "https://bymr.local",
  apiVersion: "v-test",
  cdnUrl: "https://cdn.local",
  clientBuild: "test-build",
  debug: false,
  allowedConnectOrigins: ["https://bymr.local", "https://cdn.local"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiClient contracts", () => {
  it("/init should validate payload and include runtime metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          versionMismatch: false,
          debugMode: true,
          requiredClientBuild: "2026.02.20",
          downloadUrl: "https://downloads.example.com/client",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.init();

    expect(result.versionMismatch).toBe(false);
    expect(result.requiredClientBuild).toBe("2026.02.20");

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/init");

    const body = JSON.parse(String(call[1].body)) as Record<string, unknown>;
    expect(body.apiVersion).toBe("v-test");
    expect(body.clientBuild).toBe("test-build");
    expect(body.runtime === "web" || body.runtime === "desktop").toBe(true);
    expect(["windows", "macos", "linux", "unknown"]).toContain(body.platform);
  });

  it("/bm/getnewmap should reject invalid schema", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ newmap: true, width: 4, height: 4, data: [] }),
      })
    );

    const api = new ApiClient(config, tokenStore);
    await expect(api.getNewMap()).rejects.toThrowError();
  });

  it("should clear invalid persisted token sentinels", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("null");

    const api = new ApiClient(config, tokenStore);
    await expect(api.baseLoad("home", "view")).rejects.toThrow("Missing auth token");
    await expect(tokenStore.get()).resolves.toBeNull();
  });

  it("login should call /player/getinfo and persist token shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ error: 0, token: "jwt-token", userId: 123 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.login({ email: "dev@example.com", password: "Secret123!" });

    expect(result.token).toBe("jwt-token");
    expect(result.userId).toBe(123);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/api/v-test/player/getinfo");
    const headers = call[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("/base/load should validate payload and response", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({
          yardWidth: 30,
          yardHeight: 20,
          buildings: [{ id: "b1", type: "hq", x: 2, y: 3 }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const result = await api.baseLoad("home", "view");

    expect(result.yardWidth).toBe(30);
    expect(result.buildings[0]?.id).toBe("b1");

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/base/load");
    expect(call[1].body).toBe(JSON.stringify({ baseId: "home", mode: "view" }));
  });

  it("should surface structured HTTP errors with code and traceId", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        text: async () => JSON.stringify({ error: "Replay blocked", code: "ANTI_REPLAY", traceId: "tr-123" }),
      })
    );

    const api = new ApiClient(config, tokenStore);
    await expect(api.placeBuilding({ buildingType: "hq", x: 1, y: 1 })).rejects.toThrow(
      "Replay blocked (code=ANTI_REPLAY traceId=tr-123)"
    );
  });

  it("cmd should send envelope with op/args/seq/idempotencyKey", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ ok: true, seq: 1, serverTime: 1730000012, delta: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const result = await api.moveBuilding({ buildingId: "b-1", toX: 4, toY: 2 });

    expect(result.ok).toBe(true);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/api/v-test/cmd");
    const body = JSON.parse(String(call[1].body)) as Record<string, unknown>;
    expect(body.op).toBe("MoveBuilding");
    expect(body.args).toEqual({ buildingId: "b-1", toX: 4, toY: 2 });
    expect(body.seq).toBe(1);
    expect(typeof body.idempotencyKey).toBe("string");
  });

  it("cmd should support CancelUpgrade and CollectHarvester ops", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 1, serverTime: 1730000012, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 2, serverTime: 1730000013, delta: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    await api.cancelUpgrade({ buildingId: "b-1" });
    await api.collectHarvester({ buildingId: "b-2", amount: 50 });

    const firstBody = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(firstBody.op).toBe("CancelUpgrade");
    expect(firstBody.args).toEqual({ buildingId: "b-1" });

    const secondBody = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body));
    expect(secondBody.op).toBe("CollectHarvester");
    expect(secondBody.args).toEqual({ buildingId: "b-2", amount: 50 });
  });

  it("/base/save should enforce non-critical action and include audit", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ ok: true, savedAt: new Date().toISOString() }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const res = await api.baseSaveNonCritical("home", "SetUiPreference", { key: "zoom", value: 1.25 });

    expect(res.ok).toBe(true);

    const [, req] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = req.headers as Record<string, string>;
    expect(headers["X-BYMR-Action-Class"]).toBe("non-critical");

    const body = JSON.parse(String(req.body)) as Record<string, any>;
    expect(body.action).toBe("SetUiPreference");
    expect(body.audit.clientVersion).toBe("v-test");
  });
});
