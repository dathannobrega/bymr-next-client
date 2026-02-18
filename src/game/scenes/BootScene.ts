import { Container, Text } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ClientConfig } from "../../lib/config";
import { YardScene } from "./YardScene";

export class BootScene {
  constructor(
    private readonly deps: {
      api: ApiClient;
      root: Container;
      config: ClientConfig;
    }
  ) {}

  async run(): Promise<void> {
    const { root, api } = this.deps;

    const status = new Text({ text: "Init...", style: { fill: 0xffffff } as any });
    status.position.set(12, 40);
    root.addChild(status);

    const init = await api.init();
    if (init.versionMismatch) {
      status.text = "Client version mismatch. Update required.";
      return;
    }

    status.text = "Fetching maproom metadata...";
    // NOTE: this will fail until you have a token / login flow wired.
    // For now it demonstrates the endpoint wiring.
    try {
      const mr = await api.getNewMap();
      status.text = `Maproom: ${mr.newmap ? "v3" : "legacy"} (stub)`;
    } catch (e) {
      status.text = "Not logged in yet (expected). See docs for auth wiring.";
    }

    const yard = new YardScene({ root });
    await yard.run();
  }
}
