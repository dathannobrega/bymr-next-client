import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../client";
import { MemoryTokenStore } from "../../auth/tokenStore";

const config = {
  baseUrl: "https://bymr.local",
  apiVersion: "v-test",
  cdnUrl: "https://cdn.local",
  debug: false,
  allowedConnectOrigins: ["https://bymr.local", "https://cdn.local"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiClient contracts", () => {
  it("/init should validate a valid payload with Zod", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ versionMismatch: false, debugMode: true }),
      })
    );

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.init();

    expect(result.versionMismatch).toBe(false);
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
