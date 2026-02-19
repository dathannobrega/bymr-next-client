import { Container, Text } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ClientConfig } from "../../lib/config";
import { buildBaseLoadPayload, parseBaseLoadResponse } from "../../lib/base/baseLoad";
import type { TokenStore } from "../../lib/auth/tokenStore";
import { LoginScene } from "./LoginScene";
import { YardScene } from "./YardScene";

export class BootScene {
  constructor(
    private readonly deps: {
      api: ApiClient;
      tokenStore: TokenStore;
      root: Container;
      config: ClientConfig;
    }
  ) {}

  async run(): Promise<void> {
    const { root, api, tokenStore } = this.deps;

    const status = new Text({ text: "Init...", style: { fill: 0xffffff } as any });
    status.position.set(12, 40);
    root.addChild(status);

    const init = await api.init();
    if (init.versionMismatch) {
      status.text = `Client version mismatch. Update required. ${init.error ?? ""}`.trim();
      return;
    }

    const login = new LoginScene({ tokenStore });
    await login.run();

    status.text = "Fetching maproom metadata...";

    try {
      const mr = await api.getNewMap();
      status.text = `Maproom: ${mr.newmap ? "v3" : "legacy"}`;
    } catch {
      status.text = "Maproom metadata unavailable (missing/invalid token).";
    }

    status.text = "Loading base...";
    const payload = buildBaseLoadPayload({ baseId: "home", mode: "view" });

    let parsed = parseBaseLoadResponse({});
    try {
      const raw = await api.baseLoad(payload);
      parsed = parseBaseLoadResponse(raw);
      status.text = "Base loaded.";
    } catch {
      status.text = "Base load failed; rendering default yard.";
    }

    const yard = new YardScene({ root, base: parsed });
    await yard.run();
  }
}
