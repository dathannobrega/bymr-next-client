import { Application, Container, Text } from "pixi.js";
import type { ClientConfig } from "../lib/config";
import { ApiClient } from "../lib/api/client";
import { DesktopSecureTokenStore, MemoryTokenStore, type TokenStore } from "../lib/auth/tokenStore";
import {
  LEGACY_VIEWPORT_HEIGHT,
  LEGACY_VIEWPORT_WIDTH,
  computeLegacyViewportLayout,
} from "./legacyViewport";
import { BootScene } from "./scenes/BootScene";

export type GameAppOptions = {
  canvas: HTMLCanvasElement;
  config: ClientConfig;
};

export class GameApp {
  private readonly pixi: Application;
  private readonly root: Container;
  private readonly api: ApiClient;
  private readonly tokenStore: TokenStore;
  private readonly resizeHandler = () => this.syncLegacyCanvasLayout();

  constructor(private readonly opts: GameAppOptions) {
    this.pixi = new Application();
    this.root = new Container();

    this.tokenStore = isTauriRuntime() ? new DesktopSecureTokenStore() : new MemoryTokenStore();
    this.api = new ApiClient(opts.config, this.tokenStore);
  }

  async start(): Promise<void> {
    await this.pixi.init({
      canvas: this.opts.canvas,
      width: LEGACY_VIEWPORT_WIDTH,
      height: LEGACY_VIEWPORT_HEIGHT,
      antialias: true,
      backgroundAlpha: 0,
      autoDensity: true,
    });
    this.syncLegacyCanvasLayout();
    window.addEventListener("resize", this.resizeHandler);

    this.pixi.stage.addChild(this.root);

    if (this.opts.config.debug) {
      const t = new Text({ text: "BYMR Next (Booting...)", style: { fill: 0xffffff } as any });
      t.position.set(12, 12);
      this.root.addChild(t);
    }

    const boot = new BootScene({
      api: this.api,
      tokenStore: this.tokenStore,
      root: this.root,
      config: this.opts.config,
    });
    await boot.run();
  }

  private syncLegacyCanvasLayout(): void {
    if (typeof window === "undefined") return;

    const layout = computeLegacyViewportLayout(window.innerWidth, window.innerHeight);
    this.opts.canvas.style.width = `${layout.cssWidth}px`;
    this.opts.canvas.style.height = `${layout.cssHeight}px`;
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
