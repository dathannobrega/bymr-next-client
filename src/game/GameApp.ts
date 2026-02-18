import { Application, Container, Text } from "pixi.js";
import type { ClientConfig } from "../lib/config";
import { ApiClient } from "../lib/api/client";
import { MemoryTokenStore } from "../lib/auth/tokenStore";
import { BootScene } from "./scenes/BootScene";

export type GameAppOptions = {
  canvas: HTMLCanvasElement;
  config: ClientConfig;
};

export class GameApp {
  private readonly pixi: Application;
  private readonly root: Container;
  private readonly api: ApiClient;

  constructor(private readonly opts: GameAppOptions) {
    this.pixi = new Application();
    this.root = new Container();

    // Token store: Memory only for now (see docs to switch to OS keyring).
    const tokenStore = new MemoryTokenStore();
    this.api = new ApiClient(opts.config, tokenStore);
  }

  async start(): Promise<void> {
    await this.pixi.init({
      canvas: this.opts.canvas,
      resizeTo: window,
      antialias: true,
      backgroundAlpha: 0,
    });

    this.pixi.stage.addChild(this.root);

    // Minimal debug overlay
    if (this.opts.config.debug) {
      const t = new Text({ text: "BYMR Next (Booting...)", style: { fill: 0xffffff } as any });
      t.position.set(12, 12);
      this.root.addChild(t);
    }

    const boot = new BootScene({ api: this.api, root: this.root, config: this.opts.config });
    await boot.run();
  }
}
