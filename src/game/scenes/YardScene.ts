import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { ApiClient, StateStreamSubscription } from "../../lib/api/client";
import type { ParsedBaseLoad, YardBuilding } from "../../lib/base/baseLoad";
import {
  describePlacementType,
  getPlacementTypeExamples,
  listPlacementTypeCatalogEntries,
  normalizePlacementBuildingTypeInput,
  type PlacementTypeCatalogEntry,
} from "../../lib/base/buildingType";
import {
  getFootprintCells,
  getLegacyFootprintTilesByType,
  type BuildingFootprint,
} from "../../lib/base/footprint";
import { stateSnapshotToParsedBaseLoad } from "../../lib/base/stateSnapshot";
import type { StateStreamEvent } from "../../lib/contracts/stream";
import type { StateSnapshotResponse } from "../../lib/contracts/state";
import { applyCmdDeltaToBase } from "../../lib/game/cmdDelta";
import { TILE_H, TILE_W, roundDeterministic, worldToScreen } from "./iso";
import { MaproomOverlay } from "./MaproomOverlay";
import { SocialOverlay } from "./SocialOverlay";

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
const STREAM_RETRY_BASE_MS = 1200;
const STREAM_RETRY_MAX_MS = 15000;

const TERRAIN_ASSET_BY_THEME: Record<NonNullable<ParsedBaseLoad["yardTheme"]>, string[]> = {
  grass: [
    "assets/yardbg/grass/2174_isograss1_isograss1.png",
    "assets/yardbg/grass/2173_isograss4_isograss4.png",
  ],
  sand: ["assets/yardbg/sand/2167_isosand1_isosand1.png"],
  lava: ["assets/yardbg/lava/2169_inferno_lava1_inferno_lava1.png"],
  rock: ["assets/yardbg/rock/2180_isorock1_isorock1.png"],
  crater: ["assets/yardbg/crater/2179_isocrater1_isocrater1.png"],
};

const BUILDING_ASSET_CANDIDATES = [
  "assets/buildings/yardplanner/top.1.png",
  "assets/yard/building-placeholder.png",
];

export class YardScene {
  private world = new Container();
  private overlay = new Container();
  private uiLayer = new Container();

  private grid = new Graphics();
  private terrainSpriteLayer = new Container();
  private terrainFallbackLayer = new Graphics();
  private buildingLayer = new Container();
  private buildingTexture: Texture | null = null;
  private terrainTexture: Texture | null = null;

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
  private lastAppliedSeq = 0;
  private reconnectAttempts = 0;
  private streamStopped = false;
  private streamGeneration = 0;
  private streamSubscription: StateStreamSubscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private maproomOverlay: MaproomOverlay | null = null;
  private socialOverlay: SocialOverlay | null = null;
  private selectedTileCoord: { x: number; y: number } | null = null;

  private buildingControlWrapper: HTMLDivElement | null = null;
  private buildingControlDetails: HTMLDivElement | null = null;
  private buildingControlTypeSelect: HTMLSelectElement | null = null;
  private buildingControlSearchInput: HTMLInputElement | null = null;
  private buildingControlVisible = true;

  constructor(private readonly deps: YardSceneDeps) {
    this.baseState = deps.base;
  }

  async run(): Promise<void> {
    const { root, base } = this.deps;
    const terrainTheme = base.yardTheme ?? "grass";

    const title = new Text({
      text: `Yard (isometric v1) • terrain=${terrainTheme}`,
      style: { fill: 0xffffff } as any,
    });
    title.position.set(12, 80);
    root.addChild(title);

    this.world.eventMode = "static";
    this.world.hitArea = new Rectangle(-4000, -4000, 8000, 8000);

    this.world.addChild(
      this.terrainSpriteLayer,
      this.terrainFallbackLayer,
      this.grid,
      this.buildingLayer
    );
    this.overlay.addChild(this.hoveredTile, this.selectedTile);
    root.addChild(this.world, this.overlay, this.uiLayer);

    this.terrainTexture = await this.loadTerrainTexture(terrainTheme);
    this.buildingTexture = await this.loadBuildingTexture();
    this.buildGrid(base.yardWidth, base.yardHeight);
    this.renderBuildings(this.baseState.buildings);
    this.initCamera(base.yardWidth, base.yardHeight);
    this.setupInput(base.yardWidth, base.yardHeight);
    this.setupTooltip();

    const terrainSource = this.terrainTexture ? "texture" : "fallback";
    const buildingSource = this.buildingTexture ? "texture" : "fallback";

    const footer = new Text({
      text: `Buildings: ${base.buildings.length} • Wheel: zoom • Drag: pan • Click: selecionar tile • Shift+Click: Place/Move rápido • Alt+Click/U: Upgrade • X: Cancel upgrade • C: Collect • B/O: painel de building • M: Maproom • L: Social`,
      style: { fill: 0x8fa5d6, fontSize: 12 } as any,
    });
    footer.position.set(12, 110);
    this.statusText.position.set(12, 132);
    this.resourcesText.position.set(12, 154);
    const placementFootprint = getLegacyFootprintTilesByType(this.placementType);
    this.statusText.text =
      `Build mode: ready • placeType=${this.placementType} (${placementFootprint.width}x${placementFootprint.height}) ` +
      `• terrain=${terrainSource} • buildings=${buildingSource}`;
    this.updateResourcesText();
    this.uiLayer.addChild(footer, this.statusText, this.resourcesText);
    this.ensureBuildingControlPanel();

    this.maproomOverlay = new MaproomOverlay(this.deps.api);
    this.socialOverlay = new SocialOverlay(this.deps.api);
    this.startStateStream();
    window.addEventListener("beforeunload", () => this.stopStateStream(), { once: true });
  }

  private initCamera(cols: number, rows: number): void {
    const center = worldToScreen(cols / 2, rows / 2);
    const viewport = getViewportSize();

    const mapPixelWidth = (cols + rows) * (TILE_W / 2);
    const mapPixelHeight = (cols + rows) * (TILE_H / 2) + TILE_H * 2;

    const fitZoom = clamp(
      roundDeterministic(
        Math.min((viewport.width * 0.72) / mapPixelWidth, (viewport.height * 0.72) / mapPixelHeight),
        4
      ),
      MIN_ZOOM,
      1.15
    );

    this.camera = {
      x: viewport.width / 2 - center.x * fitZoom,
      y: viewport.height / 2 - center.y * fitZoom,
      zoom: fitZoom,
    };

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

      const hoverFootprint = this.resolveCurrentActionFootprint();
      this.drawFootprintOutline(this.hoveredTile, tile.tx, tile.ty, hoverFootprint, 0x8ab4ff, 2);
      this.showTooltip(
        `Tile (${tile.tx}, ${tile.ty}) • ${hoverFootprint.width}x${hoverFootprint.height}`,
        current.x + 14,
        current.y + 14
      );
    });

    this.world.on("click", async (e) => {
      const tile = this.pointerToTile(e.global.x, e.global.y);
      if (!tile) return;
      this.selectedTileCoord = { x: tile.tx, y: tile.ty };
      this.drawFootprintOutline(
        this.selectedTile,
        tile.tx,
        tile.ty,
        this.resolveCurrentActionFootprint(),
        0xf7d774,
        3
      );
      this.renderBuildingControlPanel();

      const shiftClick = "shiftKey" in e.nativeEvent && Boolean((e.nativeEvent as MouseEvent).shiftKey);
      if (!shiftClick) return;

      if (this.selectedBuildingId) {
        await this.executeMoveSelectedToTile(tile.tx, tile.ty);
        return;
      }

      await this.executePlaceAtTile(tile.tx, tile.ty);
    });

    window.addEventListener("keydown", (e) => {
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "b") {
        this.promptPlacementType();
        return;
      }

      if (key === "m") {
        this.maproomOverlay?.toggle();
        return;
      }

      if (key === "l") {
        this.socialOverlay?.toggle();
        return;
      }

      if (key === "o") {
        this.toggleBuildingControlPanel();
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
    this.terrainSpriteLayer.removeChildren();
    this.terrainFallbackLayer.clear();
    this.grid.clear();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = worldToScreen(x, y);

        if (this.terrainTexture) {
          const tileSprite = new Sprite(this.terrainTexture);
          tileSprite.anchor.set(0.5, 0);
          tileSprite.position.set(p.x, p.y);
          tileSprite.width = TILE_W;
          tileSprite.height = TILE_H;
          tileSprite.alpha = 0.95;
          this.terrainSpriteLayer.addChild(tileSprite);
        } else {
          const fillColor = (x + y) % 2 === 0 ? 0x1f364e : 0x223d57;
          this.terrainFallbackLayer.poly([
            p.x,
            p.y,
            p.x + TILE_W / 2,
            p.y + TILE_H / 2,
            p.x,
            p.y + TILE_H,
            p.x - TILE_W / 2,
            p.y + TILE_H / 2,
          ]);
          this.terrainFallbackLayer.fill({ color: fillColor, alpha: 0.92 });
        }

        this.grid.poly([
          p.x,
          p.y,
          p.x + TILE_W / 2,
          p.y + TILE_H / 2,
          p.x,
          p.y + TILE_H,
          p.x - TILE_W / 2,
          p.y + TILE_H / 2,
        ]);
        this.grid.stroke({
          width: this.terrainTexture ? 0.95 : 1.25,
          color: this.terrainTexture ? 0x20364f : 0x2a4d71,
          alpha: this.terrainTexture ? 0.55 : 0.85,
        });
      }
    }
  }

  private renderBuildings(buildings: YardBuilding[]): void {
    this.buildingLayer.removeChildren();

    buildings.forEach((building) => {
      const p = worldToScreen(building.x, building.y);
      const sprite = new Sprite(this.buildingTexture ?? Texture.WHITE);

      sprite.anchor.set(0.5, this.buildingTexture ? 0.86 : 0.9);
      sprite.position.set(p.x, p.y + TILE_H * 0.58);
      sprite.width = this.buildingTexture ? 78 : 56;
      sprite.height = this.buildingTexture ? 74 : 48;
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.tint = this.buildingTexture ? 0xffffff : 0x8be28d;
      sprite.zIndex = building.y * 100 + building.x;

      sprite.on("pointerenter", (e) => {
        sprite.tint = this.buildingTexture ? 0xddf7df : 0xb9f5bb;
        const suffix = typeof building.level === "number" ? ` Lv.${building.level}` : "";
        const footprint = this.resolveFootprintForBuilding(building);
        const pending =
          typeof building.countdownUpgrade === "number" && building.countdownUpgrade > 0
            ? ` -> Lv.${building.upgradeToLevel ?? "?"} (${building.countdownUpgrade}s)`
            : "";
        this.showTooltip(
          `${building.type} #${building.id}${suffix} ${footprint.width}x${footprint.height}${pending}`,
          e.global.x + 14,
          e.global.y + 14
        );
      });
      sprite.on("pointerleave", () => {
        sprite.tint = this.buildingTexture ? 0xffffff : 0x8be28d;
        this.hideTooltip();
      });
      sprite.on("click", async (e) => {
        this.selectedBuildingId = building.id;
        this.selectedTileCoord = { x: building.x, y: building.y };
        this.drawFootprintOutline(
          this.selectedTile,
          building.x,
          building.y,
          this.resolveFootprintForBuilding(building),
          0xf7d774,
          3
        );
        this.renderBuildingControlPanel();

        const altClick = "altKey" in e.nativeEvent && Boolean((e.nativeEvent as MouseEvent).altKey);
        if (!altClick) return;

        await this.executeUpgradeForSelected();
      });

      this.buildingLayer.addChild(sprite);
    });

    this.buildingLayer.sortableChildren = true;
  }

  private async loadTerrainTexture(theme: NonNullable<ParsedBaseLoad["yardTheme"]>): Promise<Texture | null> {
    const candidates = [...(TERRAIN_ASSET_BY_THEME[theme] ?? []), ...TERRAIN_ASSET_BY_THEME.grass];
    return this.loadFirstRenderableTexture(candidates);
  }

  private async loadBuildingTexture(): Promise<Texture | null> {
    return this.loadFirstRenderableTexture(BUILDING_ASSET_CANDIDATES);
  }

  private async loadFirstRenderableTexture(relativePaths: string[]): Promise<Texture | null> {
    const seenUrls = new Set<string>();

    for (const relativePath of relativePaths) {
      for (const candidateUrl of buildAssetCandidateUrls(this.deps.cdnUrl, relativePath)) {
        if (seenUrls.has(candidateUrl)) continue;
        seenUrls.add(candidateUrl);

        try {
          const texture = await Assets.load(candidateUrl);
          if (isRenderableTexture(texture)) {
            return texture;
          }
        } catch {
          // Try next candidate URL.
        }
      }
    }

    return null;
  }

  private drawFootprintOutline(
    target: Graphics,
    tx: number,
    ty: number,
    footprint: BuildingFootprint,
    color: number,
    width: number
  ): void {
    target.clear();

    const cells = getFootprintCells(tx, ty, footprint);
    for (const cell of cells) {
      const p = worldToScreen(cell.x, cell.y);
      target.poly([
        p.x,
        p.y,
        p.x + TILE_W / 2,
        p.y + TILE_H / 2,
        p.x,
        p.y + TILE_H,
        p.x - TILE_W / 2,
        p.y + TILE_H / 2,
      ]);
      target.stroke({ width, color, alpha: 0.95 });
    }
  }

  private resolveCurrentActionFootprint(): BuildingFootprint {
    const selected = this.getSelectedBuilding();
    if (selected) {
      return this.resolveFootprintForBuilding(selected);
    }
    return getLegacyFootprintTilesByType(this.placementType);
  }

  private resolveFootprintForBuilding(building: YardBuilding): BuildingFootprint {
    const width = building.footprintW;
    const height = building.footprintH;
    if (typeof width === "number" && width > 0 && typeof height === "number" && height > 0) {
      return { width, height };
    }
    return getLegacyFootprintTilesByType(building.type);
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

  private startStateStream(): void {
    this.streamStopped = false;
    this.reconnectAttempts = 0;
    this.openStateStream();
  }

  private openStateStream(): void {
    this.clearReconnectTimer();
    this.streamSubscription?.close();
    this.streamGeneration += 1;
    const generation = this.streamGeneration;

    this.streamSubscription = this.deps.api.openStateStream(
      { baseId: "home", scope: "main" },
      {
        onOpen: () => {
          this.reconnectAttempts = 0;
          this.statusText.text = "State stream connected.";
        },
        onEvent: (event) => this.handleStreamEvent(event),
        onError: (error) => {
          this.statusText.text = `State stream offline: ${error.message}`;
          this.scheduleReconnect();
        },
      }
    );

    void this.streamSubscription.closed.then(() => {
      if (!this.streamStopped && generation === this.streamGeneration) {
        this.scheduleReconnect();
      }
    });
  }

  private handleStreamEvent(event: StateStreamEvent): void {
    if (event.type === "ready") {
      this.statusText.text = `State stream ready (${event.payload.connectionId.slice(0, 8)})`;
      return;
    }

    if (event.type === "tick") {
      return;
    }

    if (event.type === "snapshot") {
      this.applySnapshot(event.payload.snapshot);
      this.statusText.text = "State stream snapshot synchronized.";
      return;
    }

    const streamSeq = event.payload.seq;
    if (streamSeq <= this.lastAppliedSeq) {
      return;
    }

    this.lastAppliedSeq = streamSeq;
    this.applyDelta(event.payload.delta);
    this.statusText.text = `State delta applied (seq=${streamSeq})`;
  }

  private applySnapshot(snapshot: StateSnapshotResponse): void {
    const nextBase = stateSnapshotToParsedBaseLoad(snapshot);
    const sizeChanged =
      nextBase.yardWidth !== this.baseState.yardWidth ||
      nextBase.yardHeight !== this.baseState.yardHeight;

    this.baseState = nextBase;
    if (sizeChanged) {
      this.buildGrid(nextBase.yardWidth, nextBase.yardHeight);
      this.initCamera(nextBase.yardWidth, nextBase.yardHeight);
    }

    this.renderBuildings(nextBase.buildings);
    this.updateResourcesText();
  }

  private scheduleReconnect(): void {
    if (this.streamStopped || this.reconnectTimer) return;

    this.reconnectAttempts += 1;
    const retryInMs = Math.min(
      STREAM_RETRY_MAX_MS,
      STREAM_RETRY_BASE_MS * 2 ** Math.max(0, this.reconnectAttempts - 1)
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.streamStopped) {
        this.openStateStream();
      }
    }, retryInMs);
  }

  private stopStateStream(): void {
    this.streamStopped = true;
    this.clearReconnectTimer();
    this.streamSubscription?.close();
    this.streamSubscription = null;
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private applyDelta(delta: unknown): void {
    const items = Array.isArray(delta) ? (delta as Record<string, unknown>[]) : [];
    this.baseState = applyCmdDeltaToBase(this.baseState, items);
    this.renderBuildings(this.baseState.buildings);
    this.updateResourcesText();
  }

  private applyCmdResponse(response: { seq?: number; delta?: unknown }): void {
    if (typeof response.seq === "number") {
      this.lastAppliedSeq = Math.max(this.lastAppliedSeq, response.seq);
    }
    this.applyDelta(response.delta);
  }

  private updateResourcesText(): void {
    const resources = this.baseState.resources;
    if (!resources) {
      this.resourcesText.text = "Resources: n/a";
      this.renderBuildingControlPanel();
      return;
    }

    this.resourcesText.text =
      `Resources r1=${resources.r1}/${resources.r1max} ` +
      `r2=${resources.r2}/${resources.r2max} ` +
      `r3=${resources.r3}/${resources.r3max} ` +
      `r4=${resources.r4}/${resources.r4max}`;
    this.renderBuildingControlPanel();
  }

  private getSelectedBuildingId(): string | null {
    return this.getSelectedBuilding()?.id ?? null;
  }

  private getSelectedBuilding(): YardBuilding | null {
    if (!this.selectedBuildingId) return null;
    const found = this.baseState.buildings.find((b) => b.id === this.selectedBuildingId);
    return found ?? null;
  }

  private async executeUpgradeForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para upgrade.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `UpgradeBuilding #${buildingId}...`;
      const response = await this.deps.api.upgradeBuilding({ buildingId });
      this.applyCmdResponse(response);
      this.statusText.text = `UpgradeBuilding ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Upgrade falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executeCancelUpgradeForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para cancelar upgrade.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `CancelUpgrade #${buildingId}...`;
      const response = await this.deps.api.cancelUpgrade({ buildingId });
      this.applyCmdResponse(response);
      this.statusText.text = `CancelUpgrade ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `CancelUpgrade falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executeCollectForSelected(): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para coletar.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `CollectHarvester #${buildingId}...`;
      const response = await this.deps.api.collectHarvester({ buildingId });
      this.applyCmdResponse(response);
      this.statusText.text = `CollectHarvester ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Collect falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executePlaceAtTile(x: number, y: number): Promise<void> {
    try {
      this.statusText.text = `PlaceBuilding -> (${x}, ${y})...`;
      const response = await this.deps.api.placeBuilding({
        buildingType: this.placementType,
        x,
        y,
      });
      this.applyCmdResponse(response);
      this.statusText.text = `PlaceBuilding ${this.placementType} ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Cmd falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executeMoveSelectedToTile(x: number, y: number): Promise<void> {
    const buildingId = this.getSelectedBuildingId();
    if (!buildingId) {
      this.statusText.text = "Nenhum building selecionado para mover.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `MoveBuilding #${buildingId} -> (${x}, ${y})...`;
      const response = await this.deps.api.moveBuilding({
        buildingId,
        toX: x,
        toY: y,
      });
      this.applyCmdResponse(response);
      this.statusText.text = `MoveBuilding ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Move falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private ensureBuildingControlPanel(): void {
    if (typeof document === "undefined" || this.buildingControlWrapper) return;

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "12px";
    wrapper.style.top = "184px";
    wrapper.style.width = "min(94vw, 410px)";
    wrapper.style.maxHeight = "42vh";
    wrapper.style.overflow = "auto";
    wrapper.style.zIndex = "9997";
    wrapper.style.background = "rgba(9, 16, 28, 0.96)";
    wrapper.style.border = "1px solid #2f3a55";
    wrapper.style.borderRadius = "10px";
    wrapper.style.padding = "10px";
    wrapper.style.color = "#ffffff";
    wrapper.style.display = "block";

    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <strong style="font-size:13px;">Building Ops</strong>
        <button data-building-toggle style="padding:4px 8px;background:#2d3d60;border:none;color:#fff;border-radius:6px;cursor:pointer;">Ocultar (O)</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <input data-building-search placeholder="Filtrar tipo/código/classe"
          style="flex:1;min-width:170px;padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;" />
        <select data-building-type
          style="flex:1;min-width:170px;padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;"></select>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <button data-building-place style="padding:6px 8px;background:#3a78e0;border:none;color:#fff;border-radius:6px;cursor:pointer;">Place no tile</button>
        <button data-building-move style="padding:6px 8px;background:#2a9d7b;border:none;color:#fff;border-radius:6px;cursor:pointer;">Mover selecionado</button>
        <button data-building-upgrade style="padding:6px 8px;background:#7b57d6;border:none;color:#fff;border-radius:6px;cursor:pointer;">Upgrade</button>
        <button data-building-cancel style="padding:6px 8px;background:#a65a2a;border:none;color:#fff;border-radius:6px;cursor:pointer;">Cancelar</button>
        <button data-building-collect style="padding:6px 8px;background:#20905e;border:none;color:#fff;border-radius:6px;cursor:pointer;">Coletar</button>
        <button data-building-clear style="padding:6px 8px;background:#37445f;border:none;color:#fff;border-radius:6px;cursor:pointer;">Desselecionar</button>
      </div>
      <div data-building-details style="font-size:12px;color:#d5e0ff;line-height:1.45;background:#141f36;border:1px solid #2f3a55;border-radius:8px;padding:8px;"></div>
    `;

    wrapper.querySelector<HTMLButtonElement>("[data-building-toggle]")?.addEventListener("click", () => {
      this.toggleBuildingControlPanel();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-place]")?.addEventListener("click", () => {
      const tile = this.selectedTileCoord;
      if (!tile) {
        this.statusText.text = "Selecione um tile para PlaceBuilding.";
        this.renderBuildingControlPanel();
        return;
      }
      void this.executePlaceAtTile(tile.x, tile.y);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-move]")?.addEventListener("click", () => {
      const tile = this.selectedTileCoord;
      if (!tile) {
        this.statusText.text = "Selecione um tile para MoveBuilding.";
        this.renderBuildingControlPanel();
        return;
      }
      void this.executeMoveSelectedToTile(tile.x, tile.y);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-upgrade]")?.addEventListener("click", () => {
      void this.executeUpgradeForSelected();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-cancel]")?.addEventListener("click", () => {
      void this.executeCancelUpgradeForSelected();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-collect]")?.addEventListener("click", () => {
      void this.executeCollectForSelected();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-clear]")?.addEventListener("click", () => {
      this.selectedBuildingId = null;
      if (this.selectedTileCoord) {
        const footprint = getLegacyFootprintTilesByType(this.placementType);
        this.drawFootprintOutline(
          this.selectedTile,
          this.selectedTileCoord.x,
          this.selectedTileCoord.y,
          footprint,
          0xf7d774,
          3
        );
      } else {
        this.selectedTile.clear();
      }
      this.statusText.text = "Seleção de building limpa.";
      this.renderBuildingControlPanel();
    });

    this.buildingControlTypeSelect = wrapper.querySelector<HTMLSelectElement>("[data-building-type]");
    this.buildingControlSearchInput = wrapper.querySelector<HTMLInputElement>("[data-building-search]");
    this.buildingControlDetails = wrapper.querySelector<HTMLDivElement>("[data-building-details]");

    this.buildingControlTypeSelect?.addEventListener("change", () => {
      const nextType = this.buildingControlTypeSelect?.value;
      if (!nextType) return;

      const normalized = normalizePlacementBuildingTypeInput(nextType);
      if (!normalized) {
        this.statusText.text = `Tipo inválido: ${nextType}`;
        this.renderBuildingControlPanel();
        return;
      }

      this.placementType = normalized.canonicalType;
      const footprint = getLegacyFootprintTilesByType(this.placementType);
      this.statusText.text = `placeType atualizado: ${this.placementType} (${footprint.width}x${footprint.height})`;

      if (this.selectedTileCoord) {
        this.drawFootprintOutline(
          this.selectedTile,
          this.selectedTileCoord.x,
          this.selectedTileCoord.y,
          this.resolveCurrentActionFootprint(),
          0xf7d774,
          3
        );
      }

      this.renderBuildingControlPanel();
    });

    this.buildingControlSearchInput?.addEventListener("input", () => {
      this.renderBuildingControlPanel();
    });

    this.buildingControlWrapper = wrapper;
    document.body.appendChild(wrapper);
    this.renderBuildingControlPanel();
  }

  private toggleBuildingControlPanel(forceOpen?: boolean): void {
    this.buildingControlVisible = forceOpen ?? !this.buildingControlVisible;
    if (this.buildingControlWrapper) {
      this.buildingControlWrapper.style.display = this.buildingControlVisible ? "block" : "none";
    }
    if (this.buildingControlVisible) {
      this.renderBuildingControlPanel();
    }
  }

  private renderBuildingControlPanel(): void {
    const wrapper = this.buildingControlWrapper;
    const details = this.buildingControlDetails;
    const typeSelect = this.buildingControlTypeSelect;
    const searchInput = this.buildingControlSearchInput;
    if (!wrapper || !details || !typeSelect) return;

    if (!this.buildingControlVisible) {
      wrapper.style.display = "none";
      return;
    }

    wrapper.style.display = "block";

    const selectedBuilding = this.getSelectedBuilding();
    if (!selectedBuilding && this.selectedBuildingId) {
      this.selectedBuildingId = null;
    }

    const filterRaw = searchInput?.value.trim().toLowerCase() ?? "";
    const filtered = listPlacementTypeCatalogEntries().filter((entry) => {
      if (!filterRaw) return true;
      return (
        String(entry.code).includes(filterRaw) ||
        entry.canonicalType.toLowerCase().includes(filterRaw) ||
        entry.label.toLowerCase().includes(filterRaw) ||
        entry.legacyClass.toLowerCase().includes(filterRaw) ||
        entry.category.toLowerCase().includes(filterRaw)
      );
    });

    this.renderPlacementTypeSelectOptions(typeSelect, filtered);

    const placementInfo = describePlacementType(this.placementType);
    const placementFootprint = getLegacyFootprintTilesByType(this.placementType);
    const tileLabel = this.selectedTileCoord
      ? `(${this.selectedTileCoord.x}, ${this.selectedTileCoord.y})`
      : "nenhum";

    const selectedBuildingText = selectedBuilding
      ? `${selectedBuilding.type} #${selectedBuilding.id} @ (${selectedBuilding.x}, ${selectedBuilding.y})` +
        `${selectedBuilding.level ? ` Lv.${selectedBuilding.level}` : ""}` +
        `${selectedBuilding.countdownUpgrade ? ` | upgrade em ${selectedBuilding.countdownUpgrade}s` : ""}`
      : "nenhum";

    const lines = [
      `Tipo de place: ${placementInfo?.label ?? this.placementType} (${this.placementType})`,
      `Footprint atual: ${placementFootprint.width}x${placementFootprint.height}`,
      `Tile selecionado: ${tileLabel}`,
      `Building selecionado: ${selectedBuildingText}`,
      `Status: ${this.statusText.text || "ready"}`,
      "Ações: clique em um tile e use os botões (ou Shift+Click para atalho).",
    ];

    details.innerHTML = lines.map((line) => escapeHtml(line)).join("<br>");
  }

  private renderPlacementTypeSelectOptions(
    selectEl: HTMLSelectElement,
    entries: PlacementTypeCatalogEntry[]
  ): void {
    const activeType = this.placementType;
    const nextEntries = entries.length > 0 ? entries : listPlacementTypeCatalogEntries();

    selectEl.innerHTML = nextEntries
      .map((entry) => {
        const label = `${entry.code} • ${entry.label} [${entry.category}]`;
        return `<option value=\"${escapeHtml(entry.canonicalType)}\">${escapeHtml(label)}</option>`;
      })
      .join("");

    const hasActive = nextEntries.some((entry) => entry.canonicalType === activeType);
    if (hasActive) {
      selectEl.value = activeType;
      return;
    }

    const fallback = nextEntries[0];
    if (fallback) {
      this.placementType = fallback.canonicalType;
      selectEl.value = fallback.canonicalType;
    }
  }

  private promptPlacementType(): void {
    if (this.buildingControlTypeSelect) {
      this.toggleBuildingControlPanel(true);
      this.buildingControlTypeSelect.focus();
      this.statusText.text = "Use o painel Building Ops para alterar o tipo.";
      this.renderBuildingControlPanel();
      return;
    }

    const examples = getPlacementTypeExamples().join(", ");
    const nextType = window.prompt(
      `Tipo para PlaceBuilding (${examples})`,
      this.placementType
    );
    if (!nextType) return;

    const normalized = normalizePlacementBuildingTypeInput(nextType);
    if (!normalized) {
      this.statusText.text = `Tipo inválido: ${nextType}`;
      this.renderBuildingControlPanel();
      return;
    }

    this.placementType = normalized.canonicalType;
    const footprint = getLegacyFootprintTilesByType(this.placementType);
    this.statusText.text = `placeType atualizado: ${this.placementType} (${footprint.width}x${footprint.height})`;
    this.renderBuildingControlPanel();
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

function getViewportSize(): { width: number; height: number } {
  const width = typeof window !== "undefined" ? Math.max(window.innerWidth, 320) : 1280;
  const height = typeof window !== "undefined" ? Math.max(window.innerHeight, 240) : 720;
  return { width, height };
}

function buildAssetCandidateUrls(cdnUrl: string, relativePath: string): string[] {
  const normalizedPath = relativePath.replace(/^\/+/, "");
  const urls: string[] = [];

  try {
    urls.push(new URL(normalizedPath, ensureTrailingSlash(cdnUrl)).toString());
  } catch {
    // Ignore malformed CDN URL and continue with runtime-local resolution.
  }

  const runtimeUrl = resolveRuntimeAssetUrl(normalizedPath);
  if (runtimeUrl) {
    urls.push(runtimeUrl);
  }

  return [...new Set(urls)];
}

function resolveRuntimeAssetUrl(relativePath: string): string | null {
  const normalizedPath = relativePath.replace(/^\/+/, "");

  if (typeof window === "undefined") {
    return `/${normalizedPath}`;
  }

  try {
    return new URL(normalizedPath, window.location.href).toString();
  } catch {
    return `/${normalizedPath}`;
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

function isRenderableTexture(texture: Texture): boolean {
  return texture.width > 2 && texture.height > 2;
}
