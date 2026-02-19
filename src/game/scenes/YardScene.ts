import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ParsedBaseLoad, YardBuilding } from "../../lib/base/baseLoad";
import { applyCmdDeltaToBase } from "../../lib/game/cmdDelta";
import { TILE_H, TILE_W, roundDeterministic, worldToScreen } from "./iso";

type YardSceneDeps = {
  root: Container;
  base: ParsedBaseLoad;
  cdnUrl: string;
  api: ApiClient;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.2;

export class YardScene {
  private world = new Container();
  private overlay = new Container();
  private uiLayer = new Container();

  private grid = new Graphics();
  private buildingLayer = new Container();
  private buildingTexture: Texture = Texture.WHITE;

  private tooltip = new Text({ text: "", style: { fill: 0xffffff, fontSize: 13 } as any });
  private tooltipBg = new Graphics();

  private selectedTile = new Graphics();
  private hoveredTile = new Graphics();
  private statusText = new Text({ text: "", style: { fill: 0xa9bdff, fontSize: 12 } as any });

  private camera: Camera = { x: 0, y: 0, zoom: 1 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private baseState: ParsedBaseLoad;

  constructor(private readonly deps: YardSceneDeps) {
    this.baseState = deps.base;
  }

  async run(): Promise<void> {
    const { root, base } = this.deps;

    const title = new Text({ text: "Yard (isometric v1)", style: { fill: 0xffffff } as any });
    title.position.set(12, 80);
    root.addChild(title);

    this.world.eventMode = "static";
    this.world.hitArea = new Rectangle(-4000, -4000, 8000, 8000);

    this.world.addChild(this.grid, this.buildingLayer);
    this.overlay.addChild(this.hoveredTile, this.selectedTile);
    root.addChild(this.world, this.overlay, this.uiLayer);

    this.buildGrid(base.yardWidth, base.yardHeight);
    this.buildingTexture = await this.loadBuildingTexture();
    this.renderBuildings(this.baseState.buildings);
    this.initCamera(base.yardWidth, base.yardHeight);
    this.setupInput(base.yardWidth, base.yardHeight);
    this.setupTooltip();

    const footer = new Text({
      text: `Buildings: ${base.buildings.length} • Wheel: zoom • Drag: pan • Shift+Click: PlaceBuilding`,
      style: { fill: 0x8fa5d6, fontSize: 12 } as any,
    });
    footer.position.set(12, 110);
    this.statusText.position.set(12, 132);
    this.statusText.text = "Build mode: ready";
    this.uiLayer.addChild(footer, this.statusText);
  }

  private initCamera(cols: number, rows: number): void {
    const center = worldToScreen(cols / 2, rows / 2);
    this.camera = { x: 640 - center.x, y: 390 - center.y, zoom: 0.9 };
    this.applyCamera();
  }

  private applyCamera(): void {
    this.world.position.set(this.camera.x, this.camera.y);
    this.world.scale.set(this.camera.zoom);
    this.overlay.position.set(this.camera.x, this.camera.y);
    this.overlay.scale.set(this.camera.zoom);
  }

  private setupInput(cols: number, rows: number): void {
    this.world.on("pointerdown", (e) => {
      this.dragging = true;
      this.lastPointer = { x: e.global.x, y: e.global.y };
    });

    this.world.on("pointerup", () => {
      this.dragging = false;
    });

    this.world.on("pointerupoutside", () => {
      this.dragging = false;
    });

    this.world.on("pointermove", (e) => {
      const current = { x: e.global.x, y: e.global.y };

      if (this.dragging) {
        const dx = current.x - this.lastPointer.x;
        const dy = current.y - this.lastPointer.y;
        this.lastPointer = current;
        this.camera.x += dx;
        this.camera.y += dy;
        this.applyCamera();
      }

      const tile = this.pointerToTile(current.x, current.y);
      if (!tile || tile.tx < 0 || tile.ty < 0 || tile.tx >= cols || tile.ty >= rows) {
        this.hoveredTile.clear();
        this.hideTooltip();
        return;
      }

      this.drawTileOutline(this.hoveredTile, tile.tx, tile.ty, 0x8ab4ff, 2);
      this.showTooltip(`Tile (${tile.tx}, ${tile.ty})`, current.x + 14, current.y + 14);
    });

    this.world.on("click", async (e) => {
      const tile = this.pointerToTile(e.global.x, e.global.y);
      if (!tile) return;
      this.drawTileOutline(this.selectedTile, tile.tx, tile.ty, 0xf7d774, 3);

      const shiftClick = "shiftKey" in e.nativeEvent && Boolean((e.nativeEvent as MouseEvent).shiftKey);
      if (!shiftClick) return;

      try {
        this.statusText.text = `PlaceBuilding -> (${tile.tx}, ${tile.ty})...`;
        const response = await this.deps.api.placeBuilding({ buildingType: "hq", x: tile.tx, y: tile.ty });
        const delta = Array.isArray(response.delta) ? response.delta : [];
        this.baseState = applyCmdDeltaToBase(this.baseState, delta as Record<string, unknown>[]);
        this.renderBuildings(this.baseState.buildings);
        this.statusText.text = `PlaceBuilding ok (seq=${response.seq ?? "?"})`;
      } catch (err) {
        this.statusText.text = `PlaceBuilding falhou: ${String((err as Error)?.message ?? err)}`;
      }
    });

    window.addEventListener(
      "wheel",
      (e) => {
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = direction > 0 ? 1.08 : 0.92;
        this.camera.zoom = clamp(roundDeterministic(this.camera.zoom * factor, 4), MIN_ZOOM, MAX_ZOOM);
        this.applyCamera();
      },
      { passive: true }
    );
  }

  private pointerToTile(screenX: number, screenY: number): { tx: number; ty: number } | null {
    const worldX = (screenX - this.camera.x) / this.camera.zoom;
    const worldY = (screenY - this.camera.y) / this.camera.zoom;

    const tx = (worldY / (TILE_H / 2) + worldX / (TILE_W / 2)) / 2;
    const ty = (worldY / (TILE_H / 2) - worldX / (TILE_W / 2)) / 2;

    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;
    return {
      tx: Math.floor(tx),
      ty: Math.floor(ty),
    };
  }

  private buildGrid(cols: number, rows: number): void {
    this.grid.clear();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = worldToScreen(x, y);
        this.grid.poly([p.x, p.y, p.x + TILE_W / 2, p.y + TILE_H / 2, p.x, p.y + TILE_H, p.x - TILE_W / 2, p.y + TILE_H / 2]);
        this.grid.stroke({ width: 1, color: 0x203249, alpha: 0.9 });
      }
    }
  }

  private renderBuildings(buildings: YardBuilding[]): void {
    this.buildingLayer.removeChildren();

    buildings.forEach((building) => {
      const p = worldToScreen(building.x, building.y);
      const sprite = new Sprite(this.buildingTexture);
      sprite.anchor.set(0.5, 0.9);
      sprite.position.set(p.x, p.y + TILE_H * 0.58);
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.tint = 0x8be28d;
      sprite.zIndex = building.y * 100 + building.x;

      sprite.on("pointerenter", (e) => {
        sprite.tint = 0xb9f5bb;
        const suffix = typeof building.level === "number" ? ` Lv.${building.level}` : "";
        this.showTooltip(`${building.type} #${building.id}${suffix}`, e.global.x + 14, e.global.y + 14);
      });
      sprite.on("pointerleave", () => {
        sprite.tint = 0x8be28d;
        this.hideTooltip();
      });
      sprite.on("click", () => {
        this.drawTileOutline(this.selectedTile, building.x, building.y, 0xf7d774, 3);
      });

      this.buildingLayer.addChild(sprite);
    });

    this.buildingLayer.sortableChildren = true;
  }

  private async loadBuildingTexture(): Promise<Texture> {
    const atlasUrl = new URL("/assets/yard/building-placeholder.png", this.deps.cdnUrl).toString();

    try {
      return await Assets.load(atlasUrl);
    } catch {
      return Texture.WHITE;
    }
  }

  private drawTileOutline(target: Graphics, tx: number, ty: number, color: number, width: number): void {
    const p = worldToScreen(tx, ty);
    target.clear();
    target.poly([p.x, p.y, p.x + TILE_W / 2, p.y + TILE_H / 2, p.x, p.y + TILE_H, p.x - TILE_W / 2, p.y + TILE_H / 2]);
    target.stroke({ width, color, alpha: 0.95 });
  }

  private setupTooltip(): void {
    this.tooltip.visible = false;
    this.tooltipBg.visible = false;
    this.uiLayer.addChild(this.tooltipBg, this.tooltip);
  }

  private showTooltip(text: string, x: number, y: number): void {
    this.tooltip.text = text;
    this.tooltip.position.set(x, y);
    this.tooltip.visible = true;

    const pad = 6;
    this.tooltipBg.clear();
    this.tooltipBg.roundRect(this.tooltip.x - pad, this.tooltip.y - pad, this.tooltip.width + pad * 2, this.tooltip.height + pad * 2, 6);
    this.tooltipBg.fill({ color: 0x111a28, alpha: 0.92 });
    this.tooltipBg.stroke({ width: 1, color: 0x4f6485, alpha: 1 });
    this.tooltipBg.visible = true;
  }

  private hideTooltip(): void {
    this.tooltip.visible = false;
    this.tooltipBg.visible = false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
