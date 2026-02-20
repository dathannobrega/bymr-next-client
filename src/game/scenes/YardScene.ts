import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ParsedBaseLoad, YardBuilding } from "../../lib/base/baseLoad";
import {
  getPlacementTypeExamples,
  normalizePlacementBuildingTypeInput,
} from "../../lib/base/buildingType";
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
  private resourcesText = new Text({ text: "", style: { fill: 0x7ed39e, fontSize: 12 } as any });
  private placementType = "hq";

  private camera: Camera = { x: 0, y: 0, zoom: 1 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private baseState: ParsedBaseLoad;
  private selectedBuildingId: string | null = null;

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
      text: `Buildings: ${base.buildings.length} • Wheel: zoom • Drag: pan • Shift+Click: Place/Move • Alt+Click/U: Upgrade • X: Cancel upgrade • C: Collect • B: type`,
      style: { fill: 0x8fa5d6, fontSize: 12 } as any,
    });
    footer.position.set(12, 110);
    this.statusText.position.set(12, 132);
    this.resourcesText.position.set(12, 154);
    this.statusText.text = `Build mode: ready • placeType=${this.placementType}`;
    this.updateResourcesText();
    this.uiLayer.addChild(footer, this.statusText, this.resourcesText);
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
        if (this.selectedBuildingId) {
          this.statusText.text = `MoveBuilding #${this.selectedBuildingId} -> (${tile.tx}, ${tile.ty})...`;
          const response = await this.deps.api.moveBuilding({
            buildingId: this.selectedBuildingId,
            toX: tile.tx,
            toY: tile.ty,
          });
          this.applyDelta(response.delta);
          this.statusText.text = `MoveBuilding ok (seq=${response.seq ?? "?"})`;
          return;
        }

        this.statusText.text = `PlaceBuilding -> (${tile.tx}, ${tile.ty})...`;
        const response = await this.deps.api.placeBuilding({
          buildingType: this.placementType,
          x: tile.tx,
          y: tile.ty,
        });
        this.applyDelta(response.delta);
        this.statusText.text = `PlaceBuilding ${this.placementType} ok (seq=${response.seq ?? "?"})`;
      } catch (err) {
        this.statusText.text = `Cmd falhou: ${String((err as Error)?.message ?? err)}`;
      }
    });

    window.addEventListener("keydown", (e) => {
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "b") {
        this.promptPlacementType();
        return;
      }

      if (key === "u") {
        void this.executeUpgradeForSelected();
        return;
      }

      if (key === "x") {
        void this.executeCancelUpgradeForSelected();
        return;
      }

      if (key === "c") {
        void this.executeCollectForSelected();
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
        const pending =
          typeof building.countdownUpgrade === "number" && building.countdownUpgrade > 0
            ? ` -> Lv.${building.upgradeToLevel ?? "?"} (${building.countdownUpgrade}s)`
            : "";
        this.showTooltip(`${building.type} #${building.id}${suffix}${pending}`, e.global.x + 14, e.global.y + 14);
      });
      sprite.on("pointerleave", () => {
        sprite.tint = 0x8be28d;
        this.hideTooltip();
      });
      sprite.on("click", async (e) => {
        this.selectedBuildingId = building.id;
        this.drawTileOutline(this.selectedTile, building.x, building.y, 0xf7d774, 3);

        const altClick = "altKey" in e.nativeEvent && Boolean((e.nativeEvent as MouseEvent).altKey);
        if (!altClick) return;

        await this.executeUpgradeForSelected();
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

  private applyDelta(delta: unknown): void {
    const items = Array.isArray(delta) ? (delta as Record<string, unknown>[]) : [];
    this.baseState = applyCmdDeltaToBase(this.baseState, items);
    this.renderBuildings(this.baseState.buildings);
    this.updateResourcesText();
  }

  private updateResourcesText(): void {
    const resources = this.baseState.resources;
    if (!resources) {
      this.resourcesText.text = "Resources: n/a";
      return;
    }

    this.resourcesText.text =
      `Resources r1=${resources.r1}/${resources.r1max} ` +
      `r2=${resources.r2}/${resources.r2max} ` +
      `r3=${resources.r3}/${resources.r3max} ` +
      `r4=${resources.r4}/${resources.r4max}`;
  }

  private getSelectedBuildingId(): string | null {
    if (!this.selectedBuildingId) return null;
    const found = this.baseState.buildings.find((b) => b.id === this.selectedBuildingId);
    return found ? found.id : null;
  }

  private async executeUpgradeForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para upgrade.";
      return;
    }

    try {
      this.statusText.text = `UpgradeBuilding #${buildingId}...`;
      const response = await this.deps.api.upgradeBuilding({ buildingId });
      this.applyDelta(response.delta);
      this.statusText.text = `UpgradeBuilding ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Upgrade falhou: ${String((err as Error)?.message ?? err)}`;
    }
  }

  private async executeCancelUpgradeForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para cancelar upgrade.";
      return;
    }

    try {
      this.statusText.text = `CancelUpgrade #${buildingId}...`;
      const response = await this.deps.api.cancelUpgrade({ buildingId });
      this.applyDelta(response.delta);
      this.statusText.text = `CancelUpgrade ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `CancelUpgrade falhou: ${String((err as Error)?.message ?? err)}`;
    }
  }

  private async executeCollectForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para coletar.";
      return;
    }

    try {
      this.statusText.text = `CollectHarvester #${buildingId}...`;
      const response = await this.deps.api.collectHarvester({ buildingId });
      this.applyDelta(response.delta);
      this.statusText.text = `CollectHarvester ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Collect falhou: ${String((err as Error)?.message ?? err)}`;
    }
  }

  private promptPlacementType(): void {
    const examples = getPlacementTypeExamples().join(", ");
    const nextType = window.prompt(
      `Tipo para PlaceBuilding (${examples})`,
      this.placementType
    );
    if (!nextType) return;

    const normalized = normalizePlacementBuildingTypeInput(nextType);
    if (!normalized) {
      this.statusText.text = `Tipo inválido: ${nextType}`;
      return;
    }

    this.placementType = normalized.canonicalType;
    this.statusText.text = `placeType atualizado: ${this.placementType}`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
}
