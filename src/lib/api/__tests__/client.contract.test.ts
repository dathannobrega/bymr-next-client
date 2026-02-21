import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../client";
import { MemoryTokenStore } from "../../auth/tokenStore";
import { ClientHttpError } from "../httpError";

const config = {
  baseUrl: "https://bymr.local",
  apiVersion: "v-test",
  cdnUrl: "https://cdn.local",
  clientBuild: "test-build",
  debug: false,
  allowedConnectOrigins: ["https://bymr.local", "https://cdn.local"],
};

const canonicalSnapshot = {
  snapshotVersion: 1,
  serverTime: 1730000012,
  player: {
    userId: 123,
    username: "dev",
    banned: false,
    chatEnabled: true,
    friendCount: 0,
  },
  base: {
    baseId: "1001",
    baseSaveId: 22,
    type: "main",
    yardWidth: 20,
    yardHeight: 14,
    yardTheme: "grass",
  },
  progression: {
    level: 5,
    tutorialStage: 2,
    points: 1000,
    baseValue: 12000,
    empireValue: 9000,
    credits: 25,
    protected: 1,
    damage: 0,
    destroyed: 0,
  },
  resources: {
    active: { r1: 10, r2: 20, r3: 30, r4: 40, r1max: 100, r2max: 100, r3max: 100, r4max: 100 },
    main: { r1: 10, r2: 20, r3: 30, r4: 40, r1max: 100, r2max: 100, r3max: 100, r4max: 100 },
  },
  storeData: {
    BEW: { q: 2 },
    BUILDING22: { q: 1, e: 1730001234 },
  },
  academy: {
    buildingId: "26",
    buildingLevel: 2,
    busy: false,
    activeMonsterId: null,
    monsters: {
      C1: {
        level: 1,
        maxLevel: 6,
        inLocker: true,
        canTrain: true,
      },
    },
  },
  buildings: [{ id: "b1", type: "hq", x: 2, y: 3 }],
  maproom: {
    worldId: "w-1",
    mapVersion: 3,
    outpostCount: 4,
    canAttack: true,
  },
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
          protocol: {
            canonicalStateRequired: true,
            legacyBaseLoadFallbackAllowed: false,
            stateStreamRequired: true,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.init();

    expect(result.versionMismatch).toBe(false);
    expect(result.requiredClientBuild).toBe("2026.02.20");
    expect(result.protocol?.canonicalStateRequired).toBe(true);

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

  it("register should call /player/register without auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ user: { userid: 321, username: "newbie", email: "newbie@example.com" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.register({
      username: "newbie",
      email: "newbie@example.com",
      password: "Secret123!",
    });

    expect(result.user.userid).toBe(321);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/api/v-test/player/register");
    const headers = call[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(call[1].body).toBe(
      JSON.stringify({
        username: "newbie",
        email: "newbie@example.com",
        password: "Secret123!",
      })
    );
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

  it("/base/load should surface deprecation gate errors", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        text: async () =>
          JSON.stringify({
            error: "Endpoint /base/load is deprecated for next-client. Use /api/:apiVersion/state.",
            code: "NEXT_CLIENT_BASE_LOAD_DEPRECATED",
            traceId: "trace-base-load-deprecated",
          }),
      })
    );

    const api = new ApiClient(config, tokenStore);
    await expect(api.baseLoad("home", "view")).rejects.toThrow("NEXT_CLIENT_BASE_LOAD_DEPRECATED");
  });

  it("/state should request canonical snapshot and validate schema", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify(canonicalSnapshot),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const result = await api.stateSnapshot({ scope: "main", baseId: "home" });

    expect(result.snapshotVersion).toBe(1);
    expect(result.base.baseId).toBe("1001");
    expect(result.buildings[0]?.type).toBe("hq");
    expect(result.storeData?.BEW?.q).toBe(2);
    expect(result.academy?.monsters.C1?.canTrain).toBe(true);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/api/v-test/state?baseId=home&scope=main");
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

    try {
      await api.placeBuilding({ buildingType: "hq", x: 1, y: 1 });
      throw new Error("Expected placeBuilding to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ClientHttpError);
      const typed = error as ClientHttpError;
      expect(typed.message).toContain("Replay blocked");
      expect(typed.message).toContain("code=ANTI_REPLAY");
      expect(typed.message).toContain("traceId=tr-123");
      expect(typed.code).toBe("ANTI_REPLAY");
      expect(typed.traceId).toBe("tr-123");
      expect(typed.status).toBe(409);
      expect(typed.path).toBe("/api/v-test/cmd");
    }
  });

  it("should parse client-safe validation envelopes from middleware errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: "password: Password must contain at least one uppercase letter and one special character",
          errorDetails: {
            status: 400,
            data: {
              code: "VALIDATION_ERROR",
              issues: [
                "password: Password must contain at least one uppercase letter and one special character",
              ],
            },
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    await expect(
      api.register({
        username: "newuser",
        email: "newuser@example.com",
        password: "Secret123!",
      })
    ).rejects.toThrow("VALIDATION_ERROR");
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

  it("cmd should support building, planner, store and academy ops", async () => {
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
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 3, serverTime: 1730000014, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 4, serverTime: 1730000015, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 5, serverTime: 1730000016, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 6, serverTime: 1730000017, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 7, serverTime: 1730000018, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 8, serverTime: 1730000019, delta: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ ok: true, seq: 9, serverTime: 1730000020, delta: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    await api.cancelUpgrade({ buildingId: "b-1" });
    await api.collectHarvester({ buildingId: "b-2", amount: 50 });
    await api.purchaseStoreItem({ item: "hod", quantity: 2 });
    await api.applyYardPlannerTemplate({ slotId: 3 });
    await api.startAcademyUpgrade({ monsterId: "c1" });
    await api.cancelAcademyUpgrade({ monsterId: "c1" });
    await api.finishAcademyUpgradeNow({ monsterId: "c1" });
    await api.startRepairBuilding({ buildingId: "b-3" });
    await api.startRepairAllBuildings();

    const firstBody = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    expect(firstBody.op).toBe("CancelUpgrade");
    expect(firstBody.args).toEqual({ buildingId: "b-1" });

    const secondBody = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body));
    expect(secondBody.op).toBe("CollectHarvester");
    expect(secondBody.args).toEqual({ buildingId: "b-2", amount: 50 });

    const thirdBody = JSON.parse(String((fetchMock.mock.calls[2] as [string, RequestInit])[1].body));
    expect(thirdBody.op).toBe("PurchaseStoreItem");
    expect(thirdBody.args).toEqual({ item: "HOD", quantity: 2 });

    const fourthBody = JSON.parse(String((fetchMock.mock.calls[3] as [string, RequestInit])[1].body));
    expect(fourthBody.op).toBe("ApplyYardPlannerTemplate");
    expect(fourthBody.args).toEqual({ slotId: 3 });

    const fifthBody = JSON.parse(String((fetchMock.mock.calls[4] as [string, RequestInit])[1].body));
    expect(fifthBody.op).toBe("StartAcademyUpgrade");
    expect(fifthBody.args).toEqual({ monsterId: "C1" });

    const sixthBody = JSON.parse(String((fetchMock.mock.calls[5] as [string, RequestInit])[1].body));
    expect(sixthBody.op).toBe("CancelAcademyUpgrade");
    expect(sixthBody.args).toEqual({ monsterId: "C1" });

    const seventhBody = JSON.parse(String((fetchMock.mock.calls[6] as [string, RequestInit])[1].body));
    expect(seventhBody.op).toBe("FinishAcademyUpgradeNow");
    expect(seventhBody.args).toEqual({ monsterId: "C1" });

    const eighthBody = JSON.parse(String((fetchMock.mock.calls[7] as [string, RequestInit])[1].body));
    expect(eighthBody.op).toBe("StartRepairBuilding");
    expect(eighthBody.args).toEqual({ buildingId: "b-3" });

    const ninthBody = JSON.parse(String((fetchMock.mock.calls[8] as [string, RequestInit])[1].body));
    expect(ninthBody.op).toBe("StartRepairAllBuildings");
    expect(ninthBody.args).toEqual({});
  });

  it("yard planner template apply should validate slot id", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");
    vi.stubGlobal("fetch", vi.fn());

    const api = new ApiClient(config, tokenStore);
    await expect(api.applyYardPlannerTemplate({ slotId: 0 })).rejects.toThrow(
      "Number must be greater than 0"
    );
  });

  it("store catalog should validate schema", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            serverTime: 1730000012,
            credits: 500,
            items: {
              HOD: { t: "Hatchery Overdrive Stage 1", d: "desc", du: 3600, c: [30], i: 0, a: 1 },
            },
            storeData: {
              HOD: { q: 1, e: 1730003612 },
            },
          }),
      })
    );

    const api = new ApiClient(config, tokenStore);
    const response = await api.getStoreCatalog();
    expect(response.credits).toBe(500);
    expect(response.items.HOD?.c[0]).toBe(30);
    expect(response.storeData.HOD?.q).toBe(1);
  });

  it("yard planner templates should parse legacy-indexed payload shape", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            0: { slotid: 1, name: "Alpha", data: { a: { id: 1 } } },
            1: { slotid: 2, name: "Bravo", data: { b: { id: 2 } } },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            templates: [{ slotid: 3, name: "Charlie", data: { c: { id: 3 } } }],
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const templates = await api.getYardPlannerTemplates();
    expect(templates.templates).toHaveLength(2);
    expect(templates.templates[0]).toMatchObject({ slotId: 1, name: "Alpha" });

    const saved = await api.saveYardPlannerTemplate({
      slotId: 3,
      name: "Charlie",
      data: { c: { id: 3 } },
    });
    expect(saved.templates[0]).toMatchObject({ slotId: 3, name: "Charlie" });

    const saveCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(saveCall[0]).toBe("https://bymr.local/api/v-test/bm/yardplanner/savetemplate");
    expect(JSON.parse(String(saveCall[1].body))).toEqual({
      slotid: 3,
      name: "Charlie",
      data: { c: { id: 3 } },
    });
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

  it("/base/save should surface deprecation gate errors", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
        text: async () =>
          JSON.stringify({
            error: "Endpoint /base/save is deprecated for next-client. Use /api/:apiVersion/cmd.",
            code: "NEXT_CLIENT_BASE_SAVE_DEPRECATED",
            traceId: "trace-base-save-deprecated",
          }),
      })
    );

    const api = new ApiClient(config, tokenStore);
    await expect(
      api.baseSaveNonCritical("home", "SetUiPreference", { key: "zoom", value: 1.25 })
    ).rejects.toThrow("NEXT_CLIENT_BASE_SAVE_DEPRECATED");
  });

  it("/stream should parse SSE events and include auth header", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const body = createSseBody([
      `event: ready\ndata: ${JSON.stringify({ connectionId: "conn-1", serverTime: 1730000012, snapshotVersion: 1 })}\n\n`,
      `event: snapshot\ndata: ${JSON.stringify({ reason: "initial", snapshot: canonicalSnapshot })}\n\n`,
      `event: delta\ndata: ${JSON.stringify({ serverTime: 1730000013, seq: 1, baseId: "1001", op: "MoveBuilding", delta: [] })}\n\n`,
      `event: tick\ndata: ${JSON.stringify({ serverTime: 1730000014 })}\n\n`,
    ]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      body,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const events: string[] = [];
    const stream = api.openStateStream(
      { scope: "main", baseId: "home" },
      { onEvent: (event) => events.push(event.type) }
    );

    await stream.closed;

    expect(events).toEqual(["ready", "snapshot", "delta", "tick"]);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://bymr.local/api/v-test/stream?baseId=home&scope=main");
    const headers = call[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer dev-token");
    expect(headers.Accept).toBe("text/event-stream");
  });

  it("worldmap v3 should validate init/getcells/relocate contracts", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            celldata: [
              {
                n: "dev",
                uid: 123,
                bid: "b-1",
                tid: 0,
                x: 10,
                y: 10,
                aid: 0,
                l: 5,
                pl: 0,
                r: {},
                dm: 0,
                rel: 7,
                lo: 0,
                fr: 0,
                p: 0,
                d: 0,
                t: 0,
                fbid: "",
                b: 0,
                i: 0,
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            x: 6,
            y: 6,
            width: 10,
            height: 10,
            celldata: [],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0, mapheaderurl: "https://bymr.local/map", coords: [12, 14] }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const init = await api.worldmapInitV3();
    expect(init.celldata[0]?.x).toBe(10);

    const cells = await api.worldmapGetCellsV3({ x: 6, y: 6, width: 10, height: 10 });
    expect(cells.width).toBe(10);

    const relocated = await api.worldmapRelocateV3();
    expect(relocated.coords).toEqual([12, 14]);

    const firstUrl = (fetchMock.mock.calls[0] as [string, RequestInit])[0];
    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const thirdUrl = (fetchMock.mock.calls[2] as [string, RequestInit])[0];

    expect(firstUrl).toBe("https://bymr.local/worldmapv3/initworldmap");
    expect(secondCall[0]).toBe("https://bymr.local/worldmapv3/getcells");
    expect(secondCall[1].body).toBe(JSON.stringify({ x: 6, y: 6, width: 10, height: 10 }));
    expect(thirdUrl).toBe("https://bymr.local/worldmapv3/relocate");
  });

  it("worldmap advanced actions should serialize takeover/transfer/bookmarks payloads", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0 }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);

    await api.worldmapTakeoverCellV2({
      baseId: "b-9",
      shiny: 120,
      resources: { r1: 1000, r2: 250 },
    });

    await api.worldmapTransferAssetsV2({
      fromBaseId: "b-9",
      toBaseId: "b-10",
      fromMonsters: [{ id: "m1", amount: 3 }],
      toMonsters: [{ id: "m2", amount: 1 }],
    });

    await api.saveMaproomBookmarks({
      bookmarks: [
        {
          id: "bm-1",
          name: "Alpha",
          x: 12,
          y: 33,
          bid: "b-10",
        },
      ],
    });

    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://bymr.local/worldmapv2/takeoverCell");
    expect(firstCall[1].body).toBe(
      JSON.stringify({
        baseid: "b-9",
        shiny: "120",
        resources: JSON.stringify({ r1: 1000, r2: 250 }),
      })
    );

    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondCall[0]).toBe("https://bymr.local/worldmapv2/transferassets");
    expect(secondCall[1].body).toBe(
      JSON.stringify({
        frombaseid: "b-9",
        tobaseid: "b-10",
        monsters: JSON.stringify([
          [{ id: "m1", amount: 3 }],
          [{ id: "m2", amount: 1 }],
        ]),
      })
    );

    const thirdCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(thirdCall[0]).toBe("https://bymr.local/api/v-test/player/savebookmarks");
    expect(thirdCall[1].body).toBe(
      JSON.stringify({
        bookmarks: JSON.stringify([
          {
            id: "bm-1",
            name: "Alpha",
            x: 12,
            y: 33,
            bid: "b-10",
          },
        ]),
      })
    );
  });

  it("social endpoints should validate worlds/leaderboards/attacklogs contracts", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            worlds: [
              {
                uuid: "world-1",
                name: "World One",
                playerCount: 321,
                createdAt: "2026-02-20T12:00:00.000Z",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            leaderboard: [
              {
                username: "alpha",
                discord_tag: "alpha#0001",
                outpost_count: "12",
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            attackLogs: [
              {
                id: 10,
                attacker_userid: 123,
                attacker_username: "alpha",
                defender_userid: 456,
                defender_username: "beta",
                type: "attack",
                x: 8,
                y: 14,
                loot: { r1: 25 },
                attackreport: { result: "attacker" },
                attacktime: "2026-02-20T12:20:00.000Z",
              },
            ],
          }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);

    const worlds = await api.getAvailableWorlds();
    expect(worlds.worlds[0]?.uuid).toBe("world-1");

    const leaderboard = await api.getLeaderboards("world-1");
    expect(leaderboard.leaderboard[0]?.outpost_count).toBe(12);

    const logs = await api.getAttackLogs("both");
    expect(logs.attackLogs[0]?.type).toBe("attack");

    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://bymr.local/api/v-test/worlds");
    const firstHeaders = firstCall[1].headers as Record<string, string>;
    expect(firstHeaders.Authorization).toBeUndefined();

    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondCall[0]).toBe("https://bymr.local/api/v-test/leaderboards?worldid=world-1");
    const secondHeaders = secondCall[1].headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBeUndefined();

    const thirdCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(thirdCall[0]).toBe("https://bymr.local/api/v-test/attacklogs?filter=both");
    const thirdHeaders = thirdCall[1].headers as Record<string, string>;
    expect(thirdHeaders.Authorization).toBe("Bearer dev-token");
  });

  it("mail endpoints should serialize payloads and validate responses", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            targets: {
              "7": {
                friend: 0,
                mapver: 2,
                first_name: "alpha",
                last_name: "",
                pic_square: "https://img.local/alpha.png",
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            threads: {
              "10": {
                messageid: "0",
                threadid: 10,
                userid: 7,
                targetid: 9,
                messagetype: "message",
                unread: 1,
                message: "hello",
                subject: "Oi",
                messagecount: 1,
                updatetime: 1771619999,
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            error: 0,
            thread: {
              "0": {
                messageid: "0",
                threadid: 10,
                userid: 7,
                targetid: 9,
                messagetype: "message",
                unread: 1,
                message: "hello",
                subject: "Oi",
                messagecount: 1,
                updatetime: 1771619999,
              },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0, messageid: 0, threadid: 10 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ error: 0 }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);

    const targets = await api.getMessageTargets();
    expect(targets.targets["7"]?.first_name).toBe("alpha");

    const threads = await api.getMessageThreads();
    expect(threads.threads["10"]?.threadid).toBe(10);

    const thread = await api.getMessageThread({ threadId: 10 });
    expect(thread.thread["0"]?.message).toBe("hello");

    const send = await api.sendMessage({
      threadId: 10,
      targetUserId: 7,
      subject: "Resp",
      message: "ok",
      type: "message",
      targetBaseId: "0",
    });
    expect(send.error).toBe(0);

    const report = await api.reportMessageThread({ threadId: 10, reason: "abuse" });
    expect(report.error).toBe(0);

    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://bymr.local/api/v-test/player/getmessagetargets");
    const firstHeaders = firstCall[1].headers as Record<string, string>;
    expect(firstHeaders.Authorization).toBe("Bearer dev-token");

    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondCall[0]).toBe("https://bymr.local/api/v-test/player/getmessagethreads");

    const thirdCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(thirdCall[0]).toBe("https://bymr.local/api/v-test/player/getmessagethread");
    expect(thirdCall[1].body).toBe(JSON.stringify({ threadid: "10" }));

    const fourthCall = fetchMock.mock.calls[3] as [string, RequestInit];
    expect(fourthCall[0]).toBe("https://bymr.local/api/v-test/player/sendmessage");
    expect(fourthCall[1].body).toBe(
      JSON.stringify({
        subject: "Resp",
        type: "message",
        message: "ok",
        targetid: "7",
        threadid: "10",
        targetbaseid: "0",
      })
    );

    const fifthCall = fetchMock.mock.calls[4] as [string, RequestInit];
    expect(fifthCall[0]).toBe("https://bymr.local/api/v-test/player/reportmessagethread");
    expect(fifthCall[1].body).toBe(JSON.stringify({ threadid: "10", reason: "abuse" }));
  });

  it("combat replay should validate start payload and parse replay SSE events", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            replayId: "replay-1",
            streamPath: "/api/v-test/combat/replay/replay-1",
            startedAt: 1730001000,
            expiresAt: 1730001900,
            tickMs: 300,
            totalTicks: 10,
            estimatedDurationMs: 3000,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        body: createSseBody([
          `event: ready\ndata: ${JSON.stringify({ replayId: "replay-1", serverTime: 1730001000, schemaVersion: 1, tickMs: 300, totalTicks: 10 })}\n\n`,
          `event: snapshot\ndata: ${JSON.stringify({ replayId: "replay-1", seed: 1234, startedAt: 1730001000, attacker: { userId: 1, username: "att", baseId: "100", level: 5, power: 70, hpMax: 3000 }, defender: { userId: 2, username: "def", baseId: "200", level: 4, power: 60, hpMax: 2800, targetType: "player" } })}\n\n`,
          `event: frame\ndata: ${JSON.stringify({ tick: 1, serverTime: 1730001001, attackerHp: 2900, defenderHp: 2700, attackerDamage: 120, defenderDamage: 100, attackerCrit: false, defenderCrit: false })}\n\n`,
          `event: result\ndata: ${JSON.stringify({ winner: "attacker", endedAt: 1730001003, durationTicks: 3, loot: { r1: 10, r2: 5, r3: 0, r4: 0 } })}\n\n`,
        ]),
        text: async () => "",
      });

    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const start = await api.startCombatReplay({
      targetBaseId: "200",
      durationSec: 30,
      tickMs: 300,
      idempotencyKey: "idempotency-123",
    });

    expect(start.replayId).toBe("replay-1");

    const events: string[] = [];
    const replay = api.openCombatReplay("replay-1", {
      onEvent: (event) => events.push(event.type),
    }, { speed: "fast", fromTick: 1 });

    await replay.closed;

    expect(events).toEqual(["ready", "snapshot", "frame", "result"]);

    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://bymr.local/api/v-test/combat/start");
    expect(firstCall[1].body).toBe(
      JSON.stringify({
        targetBaseId: "200",
        durationSec: 30,
        tickMs: 300,
        idempotencyKey: "idempotency-123",
      })
    );

    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondCall[0]).toBe("https://bymr.local/api/v-test/combat/replay/replay-1?speed=fast&fromTick=1");
    const headers = secondCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer dev-token");
    expect(headers.Accept).toBe("text/event-stream");
  });
});

function createSseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}
