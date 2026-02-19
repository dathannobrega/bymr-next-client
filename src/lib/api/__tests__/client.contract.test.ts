import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiClient } from "../client";
import { MemoryTokenStore } from "../../auth/tokenStore";

const config = {
  baseUrl: "https://bymr.local",
  apiVersion: "v-test",
  cdnUrl: "https://cdn.local",
  debug: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ApiClient contracts", () => {
  it("calls /init with apiVersion and validates response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ versionMismatch: false, debugMode: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, new MemoryTokenStore());
    const result = await api.init();

    expect(result.versionMismatch).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bymr.local/init",
      expect.objectContaining({
        method: "POST",
      })
    );

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[1].body).toBe(JSON.stringify({ apiVersion: "v-test" }));
  });

  it("accepts getnewmap legacy shape", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ newmap: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const result = await api.getNewMap();

    expect(result.newmap).toBe(false);

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(call[0]).toBe("https://bymr.local/api/v-test/bm/getnewmap");
    expect(headers.Authorization).toBe("Bearer dev-token");
  });

  it("accepts getnewmap v3 shape", async () => {
    const tokenStore = new MemoryTokenStore();
    await tokenStore.set("dev-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({
        newmap: true,
        mapheaderurl: "https://bymr.local/api/bm/getnewmap",
        width: 4,
        height: 4,
        data: [{ h: 0, t: 100 }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const api = new ApiClient(config, tokenStore);
    const result = await api.getNewMap();

    expect(result.newmap).toBe(true);
    if (result.newmap) {
      expect(result.width).toBe(4);
      expect(Array.isArray(result.data)).toBe(true);
    }
  });
});
