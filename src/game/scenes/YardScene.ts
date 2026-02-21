import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, Ticker } from "pixi.js";
import type { ApiClient, StateStreamSubscription } from "../../lib/api/client";
import type { ParsedBaseLoad, StoreInventoryEntry, YardBuilding } from "../../lib/base/baseLoad";
import {
  listBuildingCatalogTabs,
  listPlacementTypeCatalogEntriesForTab,
  paginatePlacementTypeCatalogEntries,
  describePlacementType,
  getPlacementTypeExamples,
  normalizePlacementBuildingTypeInput,
  type BuildingCatalogSubTabId,
  type BuildingCatalogTabId,
} from "../../lib/base/buildingType";
import {
  DEFAULT_BUILDING_TEXTURE_PATH,
  FALLBACK_BUILDING_TEXTURE_PATH,
  resolveBuildingTexturePath,
} from "../../lib/base/buildingTextureCatalog";
import {
  DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH,
  resolveBuildingCatalogThumbnailPath,
} from "../../lib/base/buildingThumbnailCatalog";
import {
  getBuildingInfoContextActions,
  isBuildingContextActionId,
  type BuildingContextActionId,
} from "../../lib/base/buildingInfoContext";
import {
  getFootprintCells,
  getLegacyFootprintTilesByType,
  type BuildingFootprint,
} from "../../lib/base/footprint";
import { stateSnapshotToParsedBaseLoad } from "../../lib/base/stateSnapshot";
import type { StateStreamEvent } from "../../lib/contracts/stream";
import type { StateSnapshotResponse } from "../../lib/contracts/state";
import type { StoreCatalogItem } from "../../lib/contracts/store";
import type { YardPlannerTemplate } from "../../lib/contracts/yardPlanner";
import { applyCmdDeltaToBase } from "../../lib/game/cmdDelta";
import { LegacyHud } from "../../lib/ui/legacyHud";
import {
  LEGACY_SCREEN_INIT_HEIGHT,
  LEGACY_SCREEN_INIT_WIDTH,
  LEGACY_WHEEL_MAGNIFICATION_MAX,
  LEGACY_WHEEL_MAGNIFICATION_MIN,
  LEGACY_WHEEL_MAGNIFICATION_STEP,
  LEGACY_ZOOM_DEFAULT_SCALE,
  LEGACY_ZOOM_TOGGLE_SCALE,
  clampLegacyCameraTarget,
  stepLegacyCameraAxis,
} from "./legacyCamera";
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

const STREAM_RETRY_BASE_MS = 1200;
const STREAM_RETRY_MAX_MS = 15000;
const BUILDING_CATALOG_PAGE_SIZE = 10;
const DEFAULT_STORE_REFRESH_COOLDOWN_MS = 15_000;
const LEGACY_ZOOMED_TOGGLE_EPSILON = 0.005;

type BuildingFlowMode =
  | "store"
  | "academy"
  | "hatchery"
  | "bunker"
  | "lockers"
  | "juice"
  | "housing"
  | "baiter"
  | "yard_planner";

type StoreFlowMode = Exclude<BuildingFlowMode, "yard_planner" | "academy">;

type StoreFallbackItem = {
  t: string;
  d: string;
  du: number;
  c: number[];
  i: number;
  a: number;
};

const STORE_FLOW_DEFINITIONS: Record<
  StoreFlowMode,
  { title: string; description: string; itemKeys?: string[] }
> = {
  store: {
    title: "Store",
    description: "Catálogo completo de compras com persistência autoritativa em /cmd.",
  },
  hatchery: {
    title: "Hatchery/HCC",
    description: "Boosts e aceleração de produção de hatchery.",
    itemKeys: ["HOD", "HOD2", "HOD3", "HODI", "HOD2I", "HOD3I", "SP4"],
  },
  bunker: {
    title: "Monster Bunker",
    description: "Ações de aceleração do bunker e itens relacionados.",
    itemKeys: ["BUNK", "SP4", "CLOD"],
  },
  lockers: {
    title: "Lockers/Strongbox",
    description: "Itens ligados a locker e aceleração associada.",
    itemKeys: ["CLOD", "SP4"],
  },
  juice: {
    title: "Juice Monsters",
    description: "Aceleração de juice/housing e itens de suporte.",
    itemKeys: ["MUSK", "SP4", "BLK4", "BLK5", "BLK2I", "BLK3I"],
  },
  housing: {
    title: "Housing/Compound",
    description: "Boosts de capacidade e speedups de housing.",
    itemKeys: ["BLK2", "BLK3", "BLK4", "BLK5", "BLK2I", "BLK3I", "SP4"],
  },
  baiter: {
    title: "Monster Baiter",
    description: "Top-up do baiter e aceleração.",
    itemKeys: ["MUSK", "SP4"],
  },
};

const STORE_FALLBACK_ITEMS: Record<string, StoreFallbackItem> = {
  BUNK: {
    t: "Bunker Instant Monsters",
    d: "Compra instantânea de suporte ao Monster Bunker.",
    du: 0,
    c: [1],
    i: 0,
    a: 1,
  },
};

const YARD_PLANNER_SLOT_IDS = [1, 2, 3, 4, 5, 6];

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
  DEFAULT_BUILDING_TEXTURE_PATH,
  FALLBACK_BUILDING_TEXTURE_PATH,
];

export class YardScene {
  private world = new Container();
  private overlay = new Container();
  private uiLayer = new Container();

  private grid = new Graphics();
  private terrainSpriteLayer = new Container();
  private terrainFallbackLayer = new Graphics();
  private buildingLayer = new Container();
  private defaultBuildingTexture: Texture | null = null;
  private buildingTexturesByType = new Map<string, Texture>();
  private buildingTextureLoadsInFlight = new Set<string>();
  private terrainTexture: Texture | null = null;

  private tooltip = new Text({ text: "", style: { fill: 0xffffff, fontSize: 13 } as any });
  private tooltipBg = new Graphics();

  private selectedTile = new Graphics();
  private hoveredTile = new Graphics();
  private statusText = new Text({ text: "", style: { fill: 0xa9bdff, fontSize: 12 } as any });
  private resourcesText = new Text({ text: "", style: { fill: 0x7ed39e, fontSize: 12 } as any });
  private placementType = "hq";

  private camera: Camera = { x: 0, y: 0, zoom: LEGACY_ZOOM_DEFAULT_SCALE };
  private cameraTarget = { x: 0, y: 0 };
  private legacyZoomed = false;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private yardOrigin = { x: 0, y: 0 };
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
  private buildingControlSearchInput: HTMLInputElement | null = null;
  private buildingControlTabs: HTMLDivElement | null = null;
  private buildingControlSubTabs: HTMLDivElement | null = null;
  private buildingControlCatalog: HTMLDivElement | null = null;
  private buildingControlPagination: HTMLDivElement | null = null;
  private buildingControlContextActions: HTMLDivElement | null = null;
  private buildingControlVisible = true;
  private buildingControlTab: BuildingCatalogTabId = "resources";
  private buildingControlSubTab: BuildingCatalogSubTabId = "all";
  private buildingControlPage = 0;

  private storeCatalogItems: Record<string, StoreCatalogItem> = {};
  private lastStoreCatalogRefreshAt = 0;
  private buildingFlowMode: BuildingFlowMode | null = null;
  private buildingFlowWrapper: HTMLDivElement | null = null;
  private buildingFlowTitleEl: HTMLElement | null = null;
  private buildingFlowDescriptionEl: HTMLElement | null = null;
  private buildingFlowStatusEl: HTMLElement | null = null;
  private buildingFlowSearchInput: HTMLInputElement | null = null;
  private buildingFlowContentEl: HTMLDivElement | null = null;
  private buildingFlowSearchQuery = "";
  private yardPlannerTemplates: YardPlannerTemplate[] = [];
  private legacyHud: LegacyHud | null = null;
  private lastHudStatusText = "";
  private windowKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private windowWheelHandler: ((event: WheelEvent) => void) | null = null;
  private readonly cameraTick = () => this.tickCamera();
  private readonly handleResize = () => this.handleViewportResize();

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
    this.defaultBuildingTexture = await this.loadBuildingTexture();
    this.queueBuildingTextureLoads(this.baseState.buildings);
    this.buildGrid(base.yardWidth, base.yardHeight);
    this.renderBuildings(this.baseState.buildings);
    this.initCamera(base.yardWidth, base.yardHeight);
    this.setupInput(base.yardWidth, base.yardHeight);
    this.setupTooltip();
    Ticker.shared.add(this.cameraTick);
    window.addEventListener("resize", this.handleResize);

    const terrainSource = this.terrainTexture ? "texture" : "fallback";
    const buildingSource = this.defaultBuildingTexture
      ? `texture(${this.buildingTexturesByType.size} loaded)`
      : "fallback";

    const footer = new Text({
      text: `Legacy HUD ativo • Wheel: magnify • Z: zoom legado (1x/0.5x) • Shift+Click: Place/Move • Alt+Click/U: Upgrade • X: Cancel • C: Collect • M: Maproom • L: Social`,
      style: { fill: 0x8fa5d6, fontSize: 12 } as any,
    });
    footer.position.set(12, 110);
    footer.visible = false;
    this.statusText.position.set(12, 132);
    this.resourcesText.position.set(12, 154);
    this.statusText.visible = false;
    this.resourcesText.visible = false;
    const placementFootprint = getLegacyFootprintTilesByType(this.placementType);
    this.statusText.text =
      `Build mode: ready • placeType=${this.placementType} (${placementFootprint.width}x${placementFootprint.height}) ` +
      `• terrain=${terrainSource} • buildings=${buildingSource}`;
    this.updateResourcesText();
    this.uiLayer.addChild(footer, this.statusText, this.resourcesText);
    this.ensureBuildingControlPanel();
    this.ensureBuildingFlowOverlay();
    void this.refreshStoreCatalog({ force: true, silentStatus: true });

    this.maproomOverlay = new MaproomOverlay(this.deps.api);
    this.socialOverlay = new SocialOverlay(this.deps.api);
    this.initLegacyHud();
    this.startStateStream();
    window.addEventListener("beforeunload", () => this.teardown(), { once: true });
  }

  private initCamera(cols: number, rows: number): void {
    this.updateYardOrigin(cols, rows);
    const viewport = getViewportSize();
    this.camera = {
      x: viewport.width / 2,
      y: viewport.height / 2,
      zoom: LEGACY_ZOOM_DEFAULT_SCALE,
    };
    this.cameraTarget = { x: this.camera.x, y: this.camera.y };
    this.legacyZoomed = false;
    this.clampCameraTargetToLegacyBounds();
    this.camera.x = this.cameraTarget.x;
    this.camera.y = this.cameraTarget.y;

    this.applyCamera();
  }

  private applyCamera(): void {
    this.world.position.set(this.camera.x, this.camera.y);
    this.world.scale.set(this.camera.zoom);
    this.overlay.position.set(this.camera.x, this.camera.y);
    this.overlay.scale.set(this.camera.zoom);
  }

  private tickCamera(): void {
    this.syncLegacyHud();
    this.clampCameraTargetToLegacyBounds();
    const nextX = stepLegacyCameraAxis(this.camera.x, this.cameraTarget.x);
    const nextY = stepLegacyCameraAxis(this.camera.y, this.cameraTarget.y);

    if (nextX === this.camera.x && nextY === this.camera.y) {
      return;
    }

    this.camera.x = roundDeterministic(nextX, 3);
    this.camera.y = roundDeterministic(nextY, 3);
    this.applyCamera();
  }

  private clampCameraTargetToLegacyBounds(): void {
    this.cameraTarget = clampLegacyCameraTarget(this.cameraTarget, getViewportSize(), this.legacyZoomed);
  }

  private centerCameraOnLegacyOrigin(immediate: boolean): void {
    const viewport = getViewportSize();
    this.cameraTarget = {
      x: viewport.width / 2,
      y: viewport.height / 2,
    };
    this.clampCameraTargetToLegacyBounds();
    if (immediate) {
      this.camera.x = this.cameraTarget.x;
      this.camera.y = this.cameraTarget.y;
      this.applyCamera();
    }
  }

  private handleViewportResize(): void {
    this.clampCameraTargetToLegacyBounds();
    const clampedCurrent = clampLegacyCameraTarget(
      { x: this.camera.x, y: this.camera.y },
      getViewportSize(),
      this.legacyZoomed
    );
    this.camera.x = clampedCurrent.x;
    this.camera.y = clampedCurrent.y;
    this.applyCamera();
  }

  private applyLegacyWheelMagnification(deltaY: number): void {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;

    const legacyNotch = deltaY > 0 ? -1 : 1;
    const nextZoom = clamp(
      roundDeterministic(this.camera.zoom + legacyNotch * LEGACY_WHEEL_MAGNIFICATION_STEP, 4),
      LEGACY_WHEEL_MAGNIFICATION_MIN,
      LEGACY_WHEEL_MAGNIFICATION_MAX
    );

    if (nextZoom === this.camera.zoom) return;

    this.camera.zoom = nextZoom;
    this.legacyZoomed = this.camera.zoom <= LEGACY_ZOOM_TOGGLE_SCALE + LEGACY_ZOOMED_TOGGLE_EPSILON;
    this.centerCameraOnLegacyOrigin(true);
  }

  private toggleLegacyZoomMode(): void {
    this.legacyZoomed = !this.legacyZoomed;
    this.camera.zoom = this.legacyZoomed
      ? LEGACY_ZOOM_TOGGLE_SCALE
      : LEGACY_ZOOM_DEFAULT_SCALE;
    this.centerCameraOnLegacyOrigin(false);
    this.applyCamera();
  }

  private teardown(): void {
    window.removeEventListener("resize", this.handleResize);
    if (this.windowKeydownHandler) {
      window.removeEventListener("keydown", this.windowKeydownHandler);
      this.windowKeydownHandler = null;
    }
    if (this.windowWheelHandler) {
      window.removeEventListener("wheel", this.windowWheelHandler);
      this.windowWheelHandler = null;
    }
    this.legacyHud?.dispose();
    this.legacyHud = null;
    Ticker.shared.remove(this.cameraTick);
    this.stopStateStream();
  }

  private initLegacyHud(): void {
    if (typeof document === "undefined") return;
    if (this.legacyHud) return;

    this.legacyHud = new LegacyHud({
      onOpenBuildOps: () => this.toggleBuildingControlPanel(true),
      onOpenStore: () => {
        void this.openStoreFlow("store");
      },
      onOpenMaproom: () => {
        void this.maproomOverlay?.open();
      },
      onOpenSocial: () => {
        void this.socialOverlay?.open();
      },
      onToggleZoom: () => this.toggleLegacyZoomMode(),
      onCenterYard: () => this.centerCameraOnLegacyOrigin(false),
      onCollectAll: () => {
        void this.executeCollectAllHarvesters();
      },
    });

    this.syncLegacyHud();
  }

  private syncLegacyHud(): void {
    if (!this.legacyHud) return;

    this.legacyHud.updateResources(this.baseState.resources, this.baseState.credits);
    this.legacyHud.updateCounters({
      gift: 0,
      inbox: 0,
      alert: 0,
    });

    const nextStatus = this.statusText.text.trim();
    if (nextStatus === this.lastHudStatusText) return;
    this.lastHudStatusText = nextStatus;
    this.legacyHud.updateStatus(nextStatus);
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
        this.cameraTarget.x += dx;
        this.cameraTarget.y += dy;
        this.clampCameraTargetToLegacyBounds();
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

    this.windowKeydownHandler = (e) => {
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

      if (key === "z") {
        this.toggleLegacyZoomMode();
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
        return;
      }

      if (key === "r") {
        void this.executeStartRepairForSelected();
      }
    };
    window.addEventListener("keydown", this.windowKeydownHandler);

    this.windowWheelHandler = (e) => {
      this.applyLegacyWheelMagnification(e.deltaY);
    };
    window.addEventListener("wheel", this.windowWheelHandler, { passive: true });
  }

  private pointerToTile(screenX: number, screenY: number): { tx: number; ty: number } | null {
    const worldX = (screenX - this.camera.x) / this.camera.zoom + this.yardOrigin.x;
    const worldY = (screenY - this.camera.y) / this.camera.zoom + this.yardOrigin.y;

    const tx = (worldY / (TILE_H / 2) + worldX / (TILE_W / 2)) / 2;
    const ty = (worldY / (TILE_H / 2) - worldX / (TILE_W / 2)) / 2;

    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;
    return {
      tx: Math.floor(tx),
      ty: Math.floor(ty),
    };
  }

  private updateYardOrigin(cols: number, rows: number): void {
    const centerTileX = Math.max(0, (cols - 1) / 2);
    const centerTileY = Math.max(0, (rows - 1) / 2);
    this.yardOrigin = worldToScreen(centerTileX, centerTileY);
  }

  private tileToYardWorld(tx: number, ty: number): { x: number; y: number } {
    const point = worldToScreen(tx, ty);
    return {
      x: point.x - this.yardOrigin.x,
      y: point.y - this.yardOrigin.y,
    };
  }

  private buildGrid(cols: number, rows: number): void {
    this.updateYardOrigin(cols, rows);
    this.terrainSpriteLayer.removeChildren();
    this.terrainFallbackLayer.clear();
    this.grid.clear();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = this.tileToYardWorld(x, y);

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
    this.queueBuildingTextureLoads(buildings);

    buildings.forEach((building) => {
      const footprint = this.resolveFootprintForBuilding(building);
      const p = this.tileToYardWorld(building.x, building.y);
      const texture = this.resolveBuildingTexture(building);
      const hasTexture = Boolean(texture);
      const sprite = new Sprite(texture ?? Texture.WHITE);

      sprite.anchor.set(0.5, hasTexture ? 0.86 : 0.9);
      sprite.position.set(p.x, p.y + TILE_H * 0.58);
      if (hasTexture) {
        const textureWidth = Math.max(1, texture?.width ?? 1);
        const targetWidth = Math.max(58, footprint.width * TILE_W * 0.9);
        const textureScale = clamp(
          roundDeterministic(targetWidth / textureWidth, 4),
          0.25,
          2.4
        );
        sprite.scale.set(textureScale);
      } else {
        sprite.width = Math.max(56, footprint.width * TILE_W * 0.58);
        sprite.height = Math.max(48, footprint.height * TILE_H * 1.45);
      }
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.tint = hasTexture ? 0xffffff : 0x8be28d;
      sprite.zIndex = building.y * 100 + building.x;

      sprite.on("pointerenter", (e) => {
        sprite.tint = hasTexture ? 0xddf7df : 0xb9f5bb;
        const suffix = typeof building.level === "number" ? ` Lv.${building.level}` : "";
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
        sprite.tint = hasTexture ? 0xffffff : 0x8be28d;
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

  private resolveBuildingTexture(building: YardBuilding): Texture | null {
    const normalized = normalizePlacementBuildingTypeInput(building.type);
    const canonicalType = normalized?.canonicalType ?? building.type.trim().toLowerCase();
    return this.buildingTexturesByType.get(canonicalType) ?? this.defaultBuildingTexture;
  }

  private queueBuildingTextureLoads(buildings: YardBuilding[]): void {
    for (const building of buildings) {
      this.queueBuildingTextureLoad(building.type);
    }
  }

  private queueBuildingTextureLoad(rawType: string): void {
    const normalized = normalizePlacementBuildingTypeInput(rawType);
    if (!normalized) return;

    const canonicalType = normalized.canonicalType;
    if (this.buildingTexturesByType.has(canonicalType)) return;
    if (this.buildingTextureLoadsInFlight.has(canonicalType)) return;

    const relativePath = resolveBuildingTexturePath(canonicalType);
    if (!relativePath) return;

    this.buildingTextureLoadsInFlight.add(canonicalType);
    void this.loadFirstRenderableTexture([relativePath])
      .then((texture) => {
        if (!texture) return;
        this.buildingTexturesByType.set(canonicalType, texture);
        this.renderBuildings(this.baseState.buildings);
      })
      .finally(() => {
        this.buildingTextureLoadsInFlight.delete(canonicalType);
      });
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
      const p = this.tileToYardWorld(cell.x, cell.y);
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
    if (this.buildingFlowMode === "academy") {
      this.renderAcademyFlow();
    }
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
    if (this.buildingFlowMode === "academy") {
      this.renderAcademyFlow();
    }
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
      const creditsLabel =
        typeof this.baseState.credits === "number" ? ` • Credits=${this.baseState.credits}` : "";
      this.resourcesText.text = `Resources: n/a${creditsLabel}`;
      this.renderBuildingControlPanel();
      this.syncLegacyHud();
      return;
    }

    const creditsLabel =
      typeof this.baseState.credits === "number" ? ` • Credits=${this.baseState.credits}` : "";
    this.resourcesText.text =
      `Resources r1=${resources.r1}/${resources.r1max} ` +
      `r2=${resources.r2}/${resources.r2max} ` +
      `r3=${resources.r3}/${resources.r3max} ` +
      `r4=${resources.r4}/${resources.r4max}${creditsLabel}`;
    this.renderBuildingControlPanel();
    this.syncLegacyHud();
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

  private async executeCollectAllHarvesters(): Promise<void> {
    const resourceBuildings = this.baseState.buildings.filter((building) => {
      const entry = describePlacementType(building.type);
      return entry?.category === "resource";
    });

    if (resourceBuildings.length === 0) {
      this.statusText.text = "Nenhum coletor de recurso encontrado para coletar.";
      this.renderBuildingControlPanel();
      return;
    }

    this.statusText.text = `CollectHarvester all (${resourceBuildings.length})...`;
    this.renderBuildingControlPanel();

    let okCount = 0;
    let failCount = 0;
    let firstError = "";

    for (const building of resourceBuildings) {
      try {
        const response = await this.deps.api.collectHarvester({ buildingId: building.id });
        this.applyCmdResponse(response);
        okCount += 1;
      } catch (error) {
        failCount += 1;
        if (!firstError) {
          firstError = String((error as Error)?.message ?? error);
        }
      }
    }

    if (failCount === 0) {
      this.statusText.text = `Collect all ok (${okCount}/${resourceBuildings.length}).`;
    } else {
      this.statusText.text =
        `Collect all parcial (${okCount} ok / ${failCount} falhas).` +
        (firstError ? ` Primeiro erro: ${firstError}` : "");
    }

    this.renderBuildingControlPanel();
  }

  private async executeStartRepairForSelected(): Promise<void> {
    const building = this.getSelectedBuilding();
    if (!building) {
      this.statusText.text = "Nenhum building selecionado para reparar.";
      this.renderBuildingControlPanel();
      return;
    }

    if (!this.isBuildingDamaged(building)) {
      this.statusText.text = "Building selecionado nao esta danificado.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `StartRepairBuilding #${building.id}...`;
      const response = await this.deps.api.startRepairBuilding({ buildingId: building.id });
      this.applyCmdResponse(response);
      this.statusText.text = `StartRepairBuilding ok (seq=${response.seq ?? "?"})`;
    } catch (err) {
      this.statusText.text = `Repair falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executeStartRepairAll(): Promise<void> {
    const damagedCount = this.countDamagedBuildings();
    if (damagedCount <= 0) {
      this.statusText.text = "Nao ha buildings danificados para reparar.";
      this.renderBuildingControlPanel();
      return;
    }

    try {
      this.statusText.text = `StartRepairAllBuildings (${damagedCount})...`;
      const response = await this.deps.api.startRepairAllBuildings({});
      this.applyCmdResponse(response);
      const queuedCount =
        response.delta?.filter((deltaItem) => deltaItem.op === "setBuildingRepairState")
          .length ?? 0;
      this.statusText.text = `StartRepairAllBuildings ok (${queuedCount}/${damagedCount})`;
    } catch (err) {
      this.statusText.text = `Repair all falhou: ${String((err as Error)?.message ?? err)}`;
      this.renderBuildingControlPanel();
    }
  }

  private async executeBuildingContextAction(actionId: BuildingContextActionId): Promise<void> {
    switch (actionId) {
      case "upgrade_selected":
        await this.executeUpgradeForSelected();
        return;
      case "cancel_upgrade_selected":
        await this.executeCancelUpgradeForSelected();
        return;
      case "start_repair_selected":
        await this.executeStartRepairForSelected();
        return;
      case "start_repair_all":
        await this.executeStartRepairAll();
        return;
      case "collect_selected":
        await this.executeCollectForSelected();
        return;
      case "collect_all_resources":
        await this.executeCollectAllHarvesters();
        return;
      case "open_maproom":
        if (!this.maproomOverlay) {
          this.statusText.text = "Maproom indisponível neste runtime.";
          this.renderBuildingControlPanel();
          return;
        }
        await this.maproomOverlay.open();
        this.statusText.text = "Maproom aberta.";
        this.renderBuildingControlPanel();
        return;
      case "open_social":
        if (!this.socialOverlay) {
          this.statusText.text = "Social indisponível neste runtime.";
          this.renderBuildingControlPanel();
          return;
        }
        await this.socialOverlay.open();
        this.statusText.text = "Social aberta.";
        this.renderBuildingControlPanel();
        return;
      case "open_store":
        await this.openStoreFlow("store");
        return;
      case "open_academy":
        await this.openAcademyFlow();
        return;
      case "open_hatchery":
        await this.openStoreFlow("hatchery");
        return;
      case "open_bunker":
        await this.openStoreFlow("bunker");
        return;
      case "open_yard_planner":
        await this.openYardPlannerFlow();
        return;
      case "open_lockers":
        await this.openStoreFlow("lockers");
        return;
      case "open_juice":
        await this.openStoreFlow("juice");
        return;
      case "open_housing":
        await this.openStoreFlow("housing");
        return;
      case "open_baiter":
        await this.openStoreFlow("baiter");
        return;
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
    wrapper.className = "legacy-window legacy-window-building";
    wrapper.dataset.legacyTheme = "active";
    wrapper.dataset.legacyFrame = "frame2";
    wrapper.style.display = "block";

    wrapper.innerHTML = `
      <div class="legacy-window-header">
        <strong class="legacy-window-title">Building Ops</strong>
        <button data-building-toggle class="legacy-btn legacy-btn-ghost">Ocultar (O)</button>
      </div>
      <div class="legacy-form-row">
        <input data-building-search placeholder="Filtrar tipo/código/classe"
          class="legacy-input legacy-input-wide" />
      </div>
      <div data-building-tabs class="legacy-chip-row"></div>
      <div data-building-subtabs class="legacy-chip-row"></div>
      <div data-building-catalog class="legacy-building-catalog"></div>
      <div data-building-pagination class="legacy-form-row legacy-form-row-spread"></div>
      <div data-building-context-actions class="legacy-chip-row"></div>
      <div class="legacy-form-row legacy-form-row-wrap">
        <button data-building-place class="legacy-btn legacy-btn-primary">Place no tile</button>
        <button data-building-move class="legacy-btn legacy-btn-positive">Mover selecionado</button>
        <button data-building-upgrade class="legacy-btn legacy-btn-primary">Upgrade</button>
        <button data-building-cancel class="legacy-btn legacy-btn-danger">Cancelar</button>
        <button data-building-repair class="legacy-btn legacy-btn-primary">Reparar</button>
        <button data-building-repair-all class="legacy-btn legacy-btn-primary">Reparar todos</button>
        <button data-building-collect class="legacy-btn legacy-btn-positive">Coletar</button>
        <button data-building-clear class="legacy-btn legacy-btn-ghost">Desselecionar</button>
      </div>
      <div data-building-details class="legacy-info-box"></div>
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

    wrapper.querySelector<HTMLButtonElement>("[data-building-repair]")?.addEventListener("click", () => {
      void this.executeStartRepairForSelected();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-repair-all]")?.addEventListener("click", () => {
      void this.executeStartRepairAll();
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

    this.buildingControlSearchInput = wrapper.querySelector<HTMLInputElement>("[data-building-search]");
    this.buildingControlTabs = wrapper.querySelector<HTMLDivElement>("[data-building-tabs]");
    this.buildingControlSubTabs = wrapper.querySelector<HTMLDivElement>("[data-building-subtabs]");
    this.buildingControlCatalog = wrapper.querySelector<HTMLDivElement>("[data-building-catalog]");
    this.buildingControlPagination = wrapper.querySelector<HTMLDivElement>("[data-building-pagination]");
    this.buildingControlContextActions = wrapper.querySelector<HTMLDivElement>(
      "[data-building-context-actions]"
    );
    this.buildingControlDetails = wrapper.querySelector<HTMLDivElement>("[data-building-details]");

    this.buildingControlTabs?.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-building-tab]");
      const nextTabRaw = button?.dataset.buildingTab;
      if (!nextTabRaw || !isBuildingCatalogTabId(nextTabRaw)) return;
      if (this.buildingControlTab === nextTabRaw) return;
      this.buildingControlTab = nextTabRaw;
      this.buildingControlSubTab = "all";
      this.buildingControlPage = 0;
      this.renderBuildingControlPanel();
    });

    this.buildingControlSubTabs?.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-building-subtab]");
      const nextSubTabRaw = button?.dataset.buildingSubtab;
      if (!nextSubTabRaw || !isBuildingCatalogSubTabId(nextSubTabRaw)) return;
      if (this.buildingControlSubTab === nextSubTabRaw) return;
      this.buildingControlSubTab = nextSubTabRaw;
      this.buildingControlPage = 0;
      this.renderBuildingControlPanel();
    });

    this.buildingControlPagination?.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-building-page]");
      const pageAction = button?.dataset.buildingPage;
      if (pageAction === "prev") {
        this.buildingControlPage = Math.max(0, this.buildingControlPage - 1);
      } else if (pageAction === "next") {
        this.buildingControlPage += 1;
      } else {
        return;
      }
      this.renderBuildingControlPanel();
    });

    this.buildingControlCatalog?.addEventListener("click", (event) => {
      const storeButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-store-buy]"
      );
      const storeItem = storeButton?.dataset.buildingStoreBuy;
      if (storeItem) {
        const quantity = parseIntSafe(storeButton.dataset.buildingStoreQuantity, 1);
        void this.executeStoreFlowPurchase(storeItem, quantity);
        return;
      }

      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-type-card]"
      );
      const nextType = button?.dataset.buildingTypeCard;
      if (!nextType) return;
      this.setPlacementType(nextType, "placeType atualizado");
    });

    this.buildingControlContextActions?.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-context-action]"
      );
      const actionId = button?.dataset.buildingContextAction;
      if (!actionId || !isBuildingContextActionId(actionId)) return;
      void this.executeBuildingContextAction(actionId);
    });

    this.buildingControlSearchInput?.addEventListener("input", () => {
      this.buildingControlPage = 0;
      this.renderBuildingControlPanel();
    });

    this.alignCatalogStateToPlacementType(true);

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
    const searchInput = this.buildingControlSearchInput;
    if (!wrapper || !details) return;

    if (!this.buildingControlVisible) {
      wrapper.style.display = "none";
      return;
    }

    wrapper.style.display = "block";

    const selectedBuilding = this.getSelectedBuilding();
    if (!selectedBuilding && this.selectedBuildingId) {
      this.selectedBuildingId = null;
    }

    const tabs = listBuildingCatalogTabs();
    if (tabs.length === 0) {
      details.innerHTML = escapeHtml("Catálogo de buildings indisponível.");
      return;
    }

    if (!tabs.some((tab) => tab.id === this.buildingControlTab)) {
      this.buildingControlTab = tabs[0].id;
      this.buildingControlSubTab = "all";
      this.buildingControlPage = 0;
    }

    const activeTab = tabs.find((tab) => tab.id === this.buildingControlTab) ?? tabs[0];
    const activeSubTabs = activeTab.subTabs ?? [];
    if (activeTab.id !== "decorations") {
      this.buildingControlSubTab = "all";
    } else if (!activeSubTabs.some((subTab) => subTab.id === this.buildingControlSubTab)) {
      this.buildingControlSubTab = "all";
    }

    if (this.buildingControlTabs) {
      this.buildingControlTabs.innerHTML = tabs
        .map((tab) => {
          const active = tab.id === this.buildingControlTab;
          return `<button data-building-tab="${tab.id}" class="legacy-btn legacy-btn-ghost legacy-building-tab${active ? " is-active" : ""}">${escapeHtml(tab.label)}</button>`;
        })
        .join("");
    }

    if (this.buildingControlSubTabs) {
      if (activeTab.id === "decorations" && activeSubTabs.length > 0) {
        this.buildingControlSubTabs.style.display = "flex";
        this.buildingControlSubTabs.innerHTML = activeSubTabs
          .map((subTab) => {
            const active = subTab.id === this.buildingControlSubTab;
            return `<button data-building-subtab="${subTab.id}" class="legacy-btn legacy-btn-ghost legacy-building-subtab${active ? " is-active" : ""}">${escapeHtml(subTab.label)}</button>`;
          })
          .join("");
      } else {
        this.buildingControlSubTabs.style.display = "none";
        this.buildingControlSubTabs.innerHTML = "";
      }
    }

    const filterRaw = searchInput?.value.trim().toLowerCase() ?? "";
    const filtered = listPlacementTypeCatalogEntriesForTab(
      this.buildingControlTab,
      this.buildingControlSubTab
    ).filter((entry) => {
      if (!filterRaw) return true;
      return (
        String(entry.code).includes(filterRaw) ||
        entry.canonicalType.toLowerCase().includes(filterRaw) ||
        entry.label.toLowerCase().includes(filterRaw) ||
        entry.legacyClass.toLowerCase().includes(filterRaw) ||
        entry.category.toLowerCase().includes(filterRaw)
      );
    });

    const pagination = paginatePlacementTypeCatalogEntries(
      filtered,
      this.buildingControlPage,
      BUILDING_CATALOG_PAGE_SIZE
    );
    this.buildingControlPage = pagination.page;

    const buildingCountsByCode = this.countBuildingCatalogEntriesByCode();
    const selectedBuildingCatalogEntry = selectedBuilding
      ? describePlacementType(selectedBuilding.type)
      : null;
    const selectedBuildingCode = selectedBuildingCatalogEntry?.code ?? null;
    const selectedBuildingCategory = selectedBuildingCatalogEntry?.category ?? null;
    const selectedBuildingHasPendingUpgrade =
      typeof selectedBuilding?.countdownUpgrade === "number" &&
      selectedBuilding.countdownUpgrade > 0;
    const resourceBuildingCount = this.countResourceBuildings();
    const damagedBuildingCount = this.countDamagedBuildings();
    const selectedBuildingIsDamaged = this.isBuildingDamaged(selectedBuilding);
    const contextActions = getBuildingInfoContextActions({
      selectedBuildingCode,
      selectedBuildingCategory,
      selectedBuildingHasPendingUpgrade,
      selectedBuildingIsDamaged,
      resourceBuildingCount,
      damagedBuildingCount,
    });

    if (this.buildingControlCatalog) {
      if (pagination.totalEntries === 0) {
        const noDataText = filterRaw
          ? `Nenhum item para o filtro "${filterRaw}".`
          : "Building coming soon.";
        this.buildingControlCatalog.innerHTML =
          `<div class="legacy-empty-state legacy-building-catalog-empty">${escapeHtml(noDataText)}</div>`;
      } else {
        this.buildingControlCatalog.innerHTML = pagination.pageEntries
          .map((entry) => {
            const placedCount = buildingCountsByCode.get(entry.code) ?? 0;
            const maxPerYardLabel =
              typeof entry.maxPerYard === "number" ? String(entry.maxPerYard) : "∞";
            const isLimitReached =
              typeof entry.maxPerYard === "number" &&
              entry.maxPerYard > 0 &&
              placedCount >= entry.maxPerYard;
            const availabilityLabel = isLimitReached ? "Limite atingido" : "Disponível";
            const isActive = entry.canonicalType === this.placementType;
            const decorationLabel = entry.decorationGroupId
              ? ` • ${entry.decorationGroupId}`
              : "";
            const storeSku = this.resolveBuildingStoreSku(entry.code);
            const storeItem = storeSku ? this.storeCatalogItems[storeSku] : undefined;
            const storeOwned = storeSku ? this.getStoreItemOwnedQuantity(storeSku) : 0;
            const storeCost = storeItem?.c?.[0] ?? null;
            const storeMetaLine = storeSku
              ? storeCost !== null
                ? `Store ${storeSku}: ${storeOwned}x • ${storeCost} shiny`
                : `Store ${storeSku}: ${storeOwned}x`
              : "";
            const storeAction = storeSku
              ? `<button data-building-store-buy="${escapeHtml(storeSku)}" data-building-store-quantity="1"
                    class="legacy-btn legacy-btn-primary legacy-btn-sm">Comprar 1</button>`
              : "";
            const availabilityLine = `No yard: ${placedCount}/${maxPerYardLabel} • ${availabilityLabel}`;
            const thumbnailPath = this.resolveCatalogThumbnailPath(entry.canonicalType);
            const cardClasses = [
              "legacy-building-card",
              isActive ? "is-active" : "",
              isLimitReached ? "is-limit-reached" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const availabilityClass = isLimitReached
              ? "legacy-building-availability is-limit"
              : "legacy-building-availability is-available";

            return `
              <div class="${cardClasses}">
                <div class="legacy-building-card-main">
                  <img
                    src="${escapeHtml(thumbnailPath)}"
                    alt="${escapeHtml(entry.label)}"
                    class="legacy-building-thumb"
                  />
                  <div class="legacy-building-card-content">
                    <div class="legacy-building-card-header">
                      <div class="legacy-building-card-title">${escapeHtml(entry.label)}</div>
                      <button data-building-type-card="${escapeHtml(entry.canonicalType)}"
                        class="legacy-btn legacy-btn-primary legacy-btn-sm">Selecionar</button>
                    </div>
                    <div class="legacy-building-meta-line">#${entry.code} • ${escapeHtml(entry.legacyClass)}</div>
                    <div class="legacy-building-meta-line">${escapeHtml(entry.category)}${escapeHtml(decorationLabel)}</div>
                    <div class="${availabilityClass}${storeAction ? " has-store-action" : ""}">${availabilityLine}</div>
                  </div>
                </div>
                ${
                  storeAction
                    ? `<div class="legacy-building-store-row">
                         <div class="legacy-building-store-line">${escapeHtml(storeMetaLine)}</div>
                         ${storeAction}
                       </div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");
      }
    }

    if (this.buildingControlPagination) {
      const hasEntries = pagination.totalEntries > 0;
      const currentPageDisplay = hasEntries ? pagination.page + 1 : 0;
      const prevDisabled = !hasEntries || pagination.page <= 0;
      const nextDisabled = !hasEntries || pagination.page >= pagination.totalPages - 1;

      this.buildingControlPagination.innerHTML = `
        <button data-building-page="prev" class="legacy-btn legacy-btn-ghost legacy-btn-sm" ${prevDisabled ? "disabled" : ""}>◀ Prev</button>
        <span class="legacy-pagination-label">Página ${currentPageDisplay}/${pagination.totalPages} • ${pagination.totalEntries} item(ns)</span>
        <button data-building-page="next" class="legacy-btn legacy-btn-ghost legacy-btn-sm" ${nextDisabled ? "disabled" : ""}>Next ▶</button>
      `;
    }

    if (this.buildingControlContextActions) {
      if (contextActions.length === 0) {
        this.buildingControlContextActions.style.display = "none";
        this.buildingControlContextActions.innerHTML = "";
      } else {
        this.buildingControlContextActions.style.display = "flex";
        this.buildingControlContextActions.innerHTML = contextActions
          .map((action) => {
            const title = action.reason ?? "";
            const classes = [
              "legacy-btn",
              action.implemented ? "legacy-btn-primary" : "legacy-btn-ghost",
              "legacy-btn-sm",
              "legacy-context-action",
              action.disabled ? "is-disabled" : "",
              !action.implemented ? "is-pending" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return `<button data-building-context-action="${action.id}" ${
              action.disabled ? "disabled" : ""
            } title="${escapeHtml(title)}"
              class="${classes}">${
                escapeHtml(action.label)
              }</button>`;
          })
          .join("");
      }
    }

    const placementInfo = describePlacementType(this.placementType);
    const placementFootprint = getLegacyFootprintTilesByType(this.placementType);
    const tileLabel = this.selectedTileCoord
      ? `(${this.selectedTileCoord.x}, ${this.selectedTileCoord.y})`
      : "nenhum";
    const placementCount = placementInfo ? (buildingCountsByCode.get(placementInfo.code) ?? 0) : 0;
    const placementMax =
      placementInfo && typeof placementInfo.maxPerYard === "number"
        ? String(placementInfo.maxPerYard)
        : "∞";

    const selectedBuildingText = selectedBuilding
      ? `${selectedBuilding.type} #${selectedBuilding.id} @ (${selectedBuilding.x}, ${selectedBuilding.y})` +
        `${typeof selectedBuilding.level === "number" ? ` Lv.${selectedBuilding.level}` : ""}` +
        `${
          typeof selectedBuilding.hp === "number" && typeof selectedBuilding.maxHp === "number"
            ? ` | HP ${selectedBuilding.hp}/${selectedBuilding.maxHp}${selectedBuilding.repairing ? " (repair)" : ""}`
            : ""
        }` +
        `${
          typeof selectedBuilding.countdownUpgrade === "number" &&
          selectedBuilding.countdownUpgrade > 0
            ? ` | upgrade em ${selectedBuilding.countdownUpgrade}s`
            : ""
        }`
      : "nenhum";
    const activeContextActionCount = contextActions.filter(
      (action) => action.implemented && !action.disabled
    ).length;
    const pendingContextActionCount = contextActions.filter(
      (action) => !action.implemented
    ).length;

    const lines = [
      `Tipo de place: ${placementInfo?.label ?? this.placementType} (${this.placementType})`,
      `Catálogo: ${activeTab.label} / ${activeTab.id === "decorations" ? this.buildingControlSubTab : "all"}`,
      `Capacidade no yard: ${placementCount}/${placementMax}`,
      `Footprint atual: ${placementFootprint.width}x${placementFootprint.height}`,
      `Tile selecionado: ${tileLabel}`,
      `Building selecionado: ${selectedBuildingText}`,
      `Ações contextuais: ${activeContextActionCount}/${contextActions.length} ativas (${pendingContextActionCount} pendentes)`,
      `Status: ${this.statusText.text || "ready"}`,
      "Ações: selecione tipo no catálogo, clique em tile e use os botões (ou Shift+Click para atalho).",
    ];

    details.innerHTML = lines.map((line) => escapeHtml(line)).join("<br>");
  }

  private ensureBuildingFlowOverlay(): void {
    if (typeof document === "undefined" || this.buildingFlowWrapper) return;

    const wrapper = document.createElement("div");
    wrapper.className = "legacy-window legacy-window-flow";
    wrapper.dataset.legacyTheme = "active";
    wrapper.dataset.legacyFrame = "frame2";
    wrapper.style.display = "none";

    wrapper.innerHTML = `
      <div class="legacy-window-header">
        <strong data-building-flow-title class="legacy-window-title">Building Flow</strong>
        <div class="legacy-form-row">
          <button data-building-flow-refresh class="legacy-btn legacy-btn-primary">Atualizar</button>
          <button data-building-flow-close class="legacy-btn legacy-btn-ghost">Fechar</button>
        </div>
      </div>
      <div data-building-flow-description class="legacy-muted-text"></div>
      <input data-building-flow-search placeholder="Filtrar item por chave/título"
        class="legacy-input legacy-input-wide" />
      <div data-building-flow-status class="legacy-muted-text"></div>
      <div data-building-flow-content></div>
    `;

    wrapper.querySelector<HTMLButtonElement>("[data-building-flow-close]")?.addEventListener("click", () => {
      this.closeBuildingFlowOverlay();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-building-flow-refresh]")?.addEventListener("click", () => {
      if (this.buildingFlowMode === "yard_planner") {
        void this.executeYardPlannerRefresh();
        return;
      }
      if (this.buildingFlowMode === "academy") {
        void this.executeAcademyRefresh();
        return;
      }
      if (this.buildingFlowMode) {
        void this.openStoreFlow(this.buildingFlowMode);
      }
    });

    this.buildingFlowSearchInput = wrapper.querySelector<HTMLInputElement>("[data-building-flow-search]");
    this.buildingFlowSearchInput?.addEventListener("input", () => {
      this.buildingFlowSearchQuery = this.buildingFlowSearchInput?.value.trim().toLowerCase() ?? "";
      if (this.buildingFlowMode === "academy") {
        this.renderAcademyFlow();
      } else if (isStoreFlowMode(this.buildingFlowMode)) {
        this.renderStoreFlow(this.buildingFlowMode);
      }
    });

    this.buildingFlowContentEl = wrapper.querySelector<HTMLDivElement>("[data-building-flow-content]");
    this.buildingFlowContentEl?.addEventListener("click", (event) => {
      const buyButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-buy]"
      );
      const buyItem = buyButton?.dataset.buildingFlowBuy;
      if (buyItem) {
        const qtyInput = this.buildingFlowContentEl?.querySelector<HTMLInputElement>(
          `[data-building-flow-qty="${buyItem}"]`
        );
        const quantity = parseIntSafe(qtyInput?.value, 1);
        void this.executeStoreFlowPurchase(buyItem, quantity);
        return;
      }

      const academyStartButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-academy-start]"
      );
      const academyStartMonsterId = academyStartButton?.dataset.buildingFlowAcademyStart;
      if (academyStartMonsterId) {
        void this.executeAcademyStart(academyStartMonsterId);
        return;
      }

      const academyCancelButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-academy-cancel]"
      );
      const academyCancelMonsterId = academyCancelButton?.dataset.buildingFlowAcademyCancel;
      if (academyCancelMonsterId) {
        void this.executeAcademyCancel(academyCancelMonsterId);
        return;
      }

      const academyFinishButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-academy-finish]"
      );
      const academyFinishMonsterId = academyFinishButton?.dataset.buildingFlowAcademyFinish;
      if (academyFinishMonsterId) {
        void this.executeAcademyFinishNow(academyFinishMonsterId);
        return;
      }

      const templateSaveButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-template-save]"
      );
      const slotRaw = templateSaveButton?.dataset.buildingFlowTemplateSave;
      if (slotRaw) {
        const slotId = parseIntSafe(slotRaw, 0);
        if (slotId > 0) {
          void this.executeYardPlannerSave(slotId);
        }
        return;
      }

      const templateApplyButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-template-apply]"
      );
      const templateApplySlotRaw = templateApplyButton?.dataset.buildingFlowTemplateApply;
      if (templateApplySlotRaw) {
        const slotId = parseIntSafe(templateApplySlotRaw, 0);
        if (slotId > 0) {
          void this.executeYardPlannerApply(slotId);
        }
        return;
      }

      const templateRefreshButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-building-flow-templates-refresh]"
      );
      if (templateRefreshButton) {
        void this.executeYardPlannerRefresh();
      }
    });

    this.buildingFlowTitleEl = wrapper.querySelector<HTMLElement>("[data-building-flow-title]");
    this.buildingFlowDescriptionEl = wrapper.querySelector<HTMLElement>(
      "[data-building-flow-description]"
    );
    this.buildingFlowStatusEl = wrapper.querySelector<HTMLElement>("[data-building-flow-status]");

    this.buildingFlowWrapper = wrapper;
    document.body.appendChild(wrapper);
  }

  private closeBuildingFlowOverlay(): void {
    this.buildingFlowMode = null;
    if (this.buildingFlowWrapper) {
      this.buildingFlowWrapper.style.display = "none";
    }
  }

  private setBuildingFlowStatus(text: string): void {
    if (this.buildingFlowStatusEl) {
      this.buildingFlowStatusEl.textContent = text;
    }
  }

  private async openStoreFlow(mode: StoreFlowMode): Promise<void> {
    this.ensureBuildingFlowOverlay();
    if (!this.buildingFlowWrapper) return;

    const flow = STORE_FLOW_DEFINITIONS[mode];
    this.buildingFlowMode = mode;
    this.buildingFlowSearchQuery = "";
    if (this.buildingFlowSearchInput) {
      this.buildingFlowSearchInput.value = "";
      this.buildingFlowSearchInput.style.display = "block";
    }

    this.buildingFlowWrapper.style.display = "block";
    if (this.buildingFlowTitleEl) this.buildingFlowTitleEl.textContent = flow.title;
    if (this.buildingFlowDescriptionEl) this.buildingFlowDescriptionEl.textContent = flow.description;
    this.setBuildingFlowStatus("Carregando catálogo...");
    this.renderBuildingControlPanel();

    try {
      await this.refreshStoreCatalog({ force: false, silentStatus: true });
      this.renderStoreFlow(mode);
      this.setBuildingFlowStatus(`Catálogo ${flow.title} carregado.`);
      this.statusText.text = `${flow.title} aberta.`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao carregar catálogo: ${message}`);
      this.statusText.text = `Falha ao abrir ${flow.title}: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private async openAcademyFlow(): Promise<void> {
    this.ensureBuildingFlowOverlay();
    if (!this.buildingFlowWrapper) return;

    this.buildingFlowMode = "academy";
    this.buildingFlowSearchQuery = "";
    if (this.buildingFlowSearchInput) {
      this.buildingFlowSearchInput.value = "";
      this.buildingFlowSearchInput.style.display = "block";
    }

    this.buildingFlowWrapper.style.display = "block";
    if (this.buildingFlowTitleEl) this.buildingFlowTitleEl.textContent = "Academy";
    if (this.buildingFlowDescriptionEl) {
      this.buildingFlowDescriptionEl.textContent =
        "Treine monstros via /cmd autoritativo (start/cancel) com custo real em r3.";
    }

    this.renderAcademyFlow();
    this.setBuildingFlowStatus("Academy carregada.");
    this.statusText.text = "Academy aberta.";
    this.renderBuildingControlPanel();
  }

  private async executeAcademyRefresh(): Promise<void> {
    this.setBuildingFlowStatus("Atualizando academy...");
    try {
      const snapshot = await this.deps.api.stateSnapshot({ scope: "main", baseId: "home" });
      this.applySnapshot(snapshot);
      this.renderAcademyFlow();
      this.setBuildingFlowStatus("Academy sincronizada com /state.");
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao sincronizar academy: ${message}`);
    }
  }

  private renderAcademyFlow(): void {
    if (!this.buildingFlowContentEl || this.buildingFlowMode !== "academy") return;

    const academy = this.baseState.academy;
    if (!academy) {
      this.buildingFlowContentEl.innerHTML =
        '<div class="legacy-empty-state">Academy indisponível no snapshot atual.</div>';
      return;
    }

    const allMonsters = Object.entries(academy.monsters)
      .map(([monsterId, monsterState]) => ({ monsterId, ...monsterState }))
      .sort((a, b) => {
        const aRunning = a.training ? 1 : 0;
        const bRunning = b.training ? 1 : 0;
        if (aRunning !== bRunning) return bRunning - aRunning;
        const aUnlocked = a.inLocker ? 1 : 0;
        const bUnlocked = b.inLocker ? 1 : 0;
        if (aUnlocked !== bUnlocked) return bUnlocked - aUnlocked;
        return a.monsterId.localeCompare(b.monsterId, "pt-BR");
      })
      .filter((entry) => {
        if (!this.buildingFlowSearchQuery) return true;
        return (
          entry.monsterId.toLowerCase().includes(this.buildingFlowSearchQuery) ||
          `lv${entry.level}`.includes(this.buildingFlowSearchQuery)
        );
      });

    if (allMonsters.length === 0) {
      this.buildingFlowContentEl.innerHTML =
        '<div class="legacy-empty-state">Nenhum monstro para o filtro atual.</div>';
      return;
    }

    const buildingLabel =
      academy.buildingId && academy.buildingLevel > 0
        ? `Academy #${academy.buildingId} Lv.${academy.buildingLevel}`
        : "Academy não construída";
    const activeMonsterLabel = academy.activeMonsterId ?? "nenhum";
    const headerStatus = academy.busy ? "ocupada" : "livre";

    this.buildingFlowContentEl.innerHTML = `
      <div class="legacy-form-row legacy-form-row-spread">
        <div class="legacy-flow-summary">${escapeHtml(buildingLabel)} • status ${escapeHtml(
          headerStatus
        )} • ativo: ${escapeHtml(activeMonsterLabel)}</div>
      </div>
      <div class="legacy-flow-grid legacy-flow-grid-store">
        ${allMonsters
          .map((monster) => {
            const isTraining = Boolean(monster.training);
            const canStart = monster.canTrain;
            const isLocked = !monster.inLocker;
            const isMaxed = monster.level >= monster.maxLevel;
            const needsAcademyUpgrade =
              academy.buildingLevel > 0 && monster.level > academy.buildingLevel;
            const estimatedInstantCost = isTraining
              ? calculateAcademyTimeSpeedupCost(monster.training?.remainingSec ?? 0)
              : calculateAcademyTimeSpeedupCost(monster.nextTrainingDurationSec ?? 0) +
                calculateAcademyResourceSpeedupCost(monster.nextTrainingCostR3 ?? 0);
            const canInstantFinish = isTraining
              ? true
              : academy.buildingLevel > 0 &&
                monster.inLocker &&
                !isMaxed &&
                !needsAcademyUpgrade &&
                !academy.busy;
            const statusLine = isTraining
              ? `Treinando -> Lv.${monster.training?.targetLevel ?? "?"} (${formatDuration(
                  monster.training?.remainingSec ?? 0
                )})`
              : isLocked
                ? "Bloqueado no locker"
                : isMaxed
                  ? "Treino máximo alcançado"
                  : needsAcademyUpgrade
                    ? `Requer Academy Lv.${monster.level}`
                    : academy.busy
                      ? "Aguardando fila (academy ocupada)"
                      : "Pronto para treinar";
            const nextTrainingLine =
              monster.nextTrainingCostR3 && monster.nextTrainingDurationSec
                ? `Próximo treino: ${monster.nextTrainingCostR3} r3 • ${formatDuration(
                    monster.nextTrainingDurationSec
                  )}`
                : "Próximo treino: n/a";
            const instantLabel =
              estimatedInstantCost > 0
                ? `Finalizar (${estimatedInstantCost} shiny)`
                : "Finalizar agora";
            const buttonHtml = isTraining
              ? `<button data-building-flow-academy-cancel="${escapeHtml(monster.monsterId)}"
                    class="legacy-btn legacy-btn-danger legacy-btn-sm">Cancelar</button>
                 <button data-building-flow-academy-finish="${escapeHtml(monster.monsterId)}"
                    class="legacy-btn legacy-btn-primary legacy-btn-sm">${escapeHtml(
                      instantLabel
                    )}</button>`
              : `<button data-building-flow-academy-start="${escapeHtml(monster.monsterId)}"
                    class="legacy-btn legacy-btn-primary legacy-btn-sm" ${
                      canStart ? "" : "disabled"
                    }>Treinar</button>
                 <button data-building-flow-academy-finish="${escapeHtml(monster.monsterId)}"
                    class="legacy-btn legacy-btn-primary legacy-btn-sm" ${
                      canInstantFinish ? "" : "disabled"
                    }>${escapeHtml(instantLabel)}</button>`;

            return `
              <div class="legacy-flow-card legacy-store-card">
                <div class="legacy-flow-card-head">
                  <div class="legacy-flow-card-title">${escapeHtml(monster.monsterId)}</div>
                  <div class="legacy-flow-card-code">Lv.${monster.level}/${monster.maxLevel}</div>
                </div>
                <div class="legacy-flow-card-text">${escapeHtml(statusLine)}</div>
                <div class="legacy-flow-card-subtext">${escapeHtml(nextTrainingLine)}</div>
                <div class="legacy-flow-card-stock">Locker: ${
                  monster.inLocker ? "desbloqueado" : "bloqueado"
                }</div>
                <div class="legacy-flow-card-actions">${buttonHtml}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  private async executeAcademyStart(monsterId: string): Promise<void> {
    const normalizedMonsterId = monsterId.trim().toUpperCase();
    if (!normalizedMonsterId) return;

    this.setBuildingFlowStatus(`Iniciando treino ${normalizedMonsterId}...`);
    try {
      const response = await this.deps.api.startAcademyUpgrade({
        monsterId: normalizedMonsterId,
      });
      this.applyCmdResponse(response);
      this.renderAcademyFlow();
      this.setBuildingFlowStatus(`Treino iniciado para ${normalizedMonsterId}.`);
      this.statusText.text = `Academy start ok (${normalizedMonsterId}).`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao iniciar ${normalizedMonsterId}: ${message}`);
      this.statusText.text = `Academy start falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private async executeAcademyCancel(monsterId: string): Promise<void> {
    const normalizedMonsterId = monsterId.trim().toUpperCase();
    if (!normalizedMonsterId) return;

    this.setBuildingFlowStatus(`Cancelando treino ${normalizedMonsterId}...`);
    try {
      const response = await this.deps.api.cancelAcademyUpgrade({
        monsterId: normalizedMonsterId,
      });
      this.applyCmdResponse(response);
      this.renderAcademyFlow();
      this.setBuildingFlowStatus(`Treino cancelado para ${normalizedMonsterId}.`);
      this.statusText.text = `Academy cancel ok (${normalizedMonsterId}).`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao cancelar ${normalizedMonsterId}: ${message}`);
      this.statusText.text = `Academy cancel falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private async executeAcademyFinishNow(monsterId: string): Promise<void> {
    const normalizedMonsterId = monsterId.trim().toUpperCase();
    if (!normalizedMonsterId) return;

    this.setBuildingFlowStatus(`Finalizando treino ${normalizedMonsterId}...`);
    try {
      const response = await this.deps.api.finishAcademyUpgradeNow({
        monsterId: normalizedMonsterId,
      });
      this.applyCmdResponse(response);
      this.renderAcademyFlow();
      this.setBuildingFlowStatus(`Treino finalizado para ${normalizedMonsterId}.`);
      this.statusText.text = `Academy finish now ok (${normalizedMonsterId}).`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao finalizar ${normalizedMonsterId}: ${message}`);
      this.statusText.text = `Academy finish falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private async openYardPlannerFlow(): Promise<void> {
    this.ensureBuildingFlowOverlay();
    if (!this.buildingFlowWrapper) return;

    this.buildingFlowMode = "yard_planner";
    this.buildingFlowSearchQuery = "";
    if (this.buildingFlowSearchInput) {
      this.buildingFlowSearchInput.value = "";
      this.buildingFlowSearchInput.style.display = "none";
    }

    this.buildingFlowWrapper.style.display = "block";
    if (this.buildingFlowTitleEl) this.buildingFlowTitleEl.textContent = "Yard Planner";
    if (this.buildingFlowDescriptionEl) {
      this.buildingFlowDescriptionEl.textContent =
        "Gerencie templates (slots) de layout via endpoints autoritativos do planner (salvar + aplicar).";
    }
    await this.executeYardPlannerRefresh();
    this.statusText.text = "Yard planner aberto.";
    this.renderBuildingControlPanel();
  }

  private async executeYardPlannerRefresh(): Promise<void> {
    this.setBuildingFlowStatus("Carregando templates...");
    try {
      const response = await this.deps.api.getYardPlannerTemplates();
      this.yardPlannerTemplates = response.templates;
      this.renderYardPlannerFlow();
      this.setBuildingFlowStatus(`Templates carregados (${this.yardPlannerTemplates.length}).`);
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao carregar templates: ${message}`);
    }
  }

  private renderYardPlannerFlow(): void {
    if (!this.buildingFlowContentEl || this.buildingFlowMode !== "yard_planner") return;

    const templateBySlot = new Map<number, YardPlannerTemplate>(
      this.yardPlannerTemplates.map((template) => [template.slotId, template])
    );

    this.buildingFlowContentEl.innerHTML = `
      <div class="legacy-form-row legacy-form-row-spread">
        <div class="legacy-flow-summary">Snapshots atuais: ${Object.keys(this.buildCurrentYardTemplateData()).length} building(s).</div>
        <button data-building-flow-templates-refresh class="legacy-btn legacy-btn-primary legacy-btn-sm">Recarregar</button>
      </div>
      <div class="legacy-flow-grid legacy-flow-grid-templates">
        ${YARD_PLANNER_SLOT_IDS.map((slotId) => {
          const template = templateBySlot.get(slotId);
          const templateName = template?.name || `Slot ${slotId}`;
          const buildingCount = template ? Object.keys(template.data).length : 0;

          return `
            <div class="legacy-flow-card">
              <div class="legacy-flow-card-title">Slot ${slotId}</div>
              <div class="legacy-flow-card-text">${escapeHtml(templateName)}</div>
              <div class="legacy-flow-card-subtext">${buildingCount} building(s)</div>
              <button data-building-flow-template-save="${slotId}"
                class="legacy-btn legacy-btn-primary legacy-btn-sm">Salvar layout atual</button>
              <button data-building-flow-template-apply="${slotId}"
                class="legacy-btn legacy-btn-ghost legacy-btn-sm" ${template ? "" : "disabled"}>Aplicar slot</button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  private async executeYardPlannerSave(slotId: number): Promise<void> {
    const existing = this.yardPlannerTemplates.find((template) => template.slotId === slotId);
    const suggestedName = existing?.name || `Layout ${slotId}`;
    const nameInput = window.prompt(`Nome do template (slot ${slotId})`, suggestedName);
    if (nameInput === null) return;

    const name = nameInput.trim();
    if (!name) {
      this.setBuildingFlowStatus("Nome do template é obrigatório.");
      return;
    }

    const data = this.buildCurrentYardTemplateData();
    const buildingCount = Object.keys(data).length;
    if (buildingCount === 0) {
      this.setBuildingFlowStatus("Não há buildings no yard para salvar no template.");
      return;
    }

    this.setBuildingFlowStatus(`Salvando slot ${slotId}...`);
    try {
      const response = await this.deps.api.saveYardPlannerTemplate({
        slotId,
        name,
        data,
      });
      this.yardPlannerTemplates = response.templates;
      this.renderYardPlannerFlow();
      this.setBuildingFlowStatus(
        `Slot ${slotId} salvo com ${buildingCount} building(s).`
      );
      this.statusText.text = `Yard planner: slot ${slotId} salvo.`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao salvar slot ${slotId}: ${message}`);
      this.statusText.text = `Yard planner falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private async executeYardPlannerApply(slotId: number): Promise<void> {
    const existing = this.yardPlannerTemplates.find((template) => template.slotId === slotId);
    if (!existing) {
      this.setBuildingFlowStatus(`Slot ${slotId} não possui template salvo.`);
      return;
    }

    this.setBuildingFlowStatus(`Aplicando slot ${slotId}...`);
    try {
      const response = await this.deps.api.applyYardPlannerTemplate({ slotId });
      this.applyCmdResponse(response);
      this.renderYardPlannerFlow();

      const movedCount =
        response.delta?.filter((deltaItem) => deltaItem.op === "moveBuilding").length ?? 0;
      this.setBuildingFlowStatus(`Slot ${slotId} aplicado (${movedCount} building(s) movidos).`);
      this.statusText.text = `Yard planner: slot ${slotId} aplicado.`;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha ao aplicar slot ${slotId}: ${message}`);
      this.statusText.text = `Yard planner falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private buildCurrentYardTemplateData(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const building of this.baseState.buildings) {
      const normalized = normalizePlacementBuildingTypeInput(building.type);
      if (normalized && normalized.code === 7) {
        // Legacy BASE.getYardPlannerBuildings excludes type 7 (mushroom).
        continue;
      }
      const numericId = parseIntSafe(building.id, Number.NaN);
      out[building.id] = {
        id: Number.isFinite(numericId) ? numericId : building.id,
        buildingId: building.id,
        ...(normalized ? { t: normalized.code } : {}),
        x: building.x,
        y: building.y,
        ...(typeof building.level === "number" ? { l: building.level } : {}),
        ...(typeof building.footprintW === "number" ? { fw: building.footprintW } : {}),
        ...(typeof building.footprintH === "number" ? { fh: building.footprintH } : {}),
      };
    }

    return out;
  }

  private async refreshStoreCatalog(opts: { force?: boolean; silentStatus?: boolean } = {}): Promise<void> {
    const now = Date.now();
    if (
      !opts.force &&
      this.lastStoreCatalogRefreshAt > 0 &&
      now - this.lastStoreCatalogRefreshAt < DEFAULT_STORE_REFRESH_COOLDOWN_MS &&
      Object.keys(this.storeCatalogItems).length > 0
    ) {
      return;
    }

    const response = await this.deps.api.getStoreCatalog();
    const normalizedItems: Record<string, StoreCatalogItem> = {};
    for (const [key, value] of Object.entries(response.items)) {
      normalizedItems[key.toUpperCase()] = value;
    }

    this.storeCatalogItems = normalizedItems;
    this.lastStoreCatalogRefreshAt = now;
    this.baseState = {
      ...this.baseState,
      credits: response.credits,
      storeData: normalizeStoreDataEntries(response.storeData),
    };

    if (!opts.silentStatus) {
      this.statusText.text = `Store sincronizada (${Object.keys(normalizedItems).length} item(ns)).`;
    }

    this.updateResourcesText();
    this.renderBuildingControlPanel();
  }

  private renderStoreFlow(mode: StoreFlowMode): void {
    if (!this.buildingFlowContentEl || this.buildingFlowMode !== mode) return;

    const itemKeys = this.getStoreFlowItemKeys(mode).filter((itemKey) => {
      if (!this.buildingFlowSearchQuery) return true;
      const definition = this.resolveStoreItemDefinition(itemKey);
      if (!definition) return false;

      return (
        itemKey.toLowerCase().includes(this.buildingFlowSearchQuery) ||
        definition.t.toLowerCase().includes(this.buildingFlowSearchQuery) ||
        definition.d.toLowerCase().includes(this.buildingFlowSearchQuery)
      );
    });

    if (itemKeys.length === 0) {
      this.buildingFlowContentEl.innerHTML =
        '<div class="legacy-empty-state">Nenhum item para este fluxo/filtro.</div>';
      return;
    }

    this.buildingFlowContentEl.innerHTML = `
      <div class="legacy-flow-grid legacy-flow-grid-store">
        ${itemKeys
          .map((itemKey) => {
            const definition = this.resolveStoreItemDefinition(itemKey);
            if (!definition) return "";

            const owned = this.getStoreItemOwnedQuantity(itemKey);
            const firstCost = definition.c[0] ?? 0;
            const maxCost = definition.c[definition.c.length - 1] ?? firstCost;
            const duration = definition.du > 0 ? `${Math.round(definition.du / 60)} min` : "instant";
            const inventory = this.baseState.storeData?.[itemKey];
            const expiresAt =
              inventory?.e && inventory.e > 0
                ? ` • expira ${new Date(inventory.e * 1000).toLocaleString()}`
                : "";

            return `
              <div class="legacy-flow-card legacy-store-card">
                <div class="legacy-flow-card-head">
                  <div class="legacy-flow-card-title">${escapeHtml(definition.t)}</div>
                  <div class="legacy-flow-card-code">${escapeHtml(itemKey)}</div>
                </div>
                <div class="legacy-flow-card-text">${escapeHtml(definition.d || "Sem descrição.")}</div>
                <div class="legacy-flow-card-cost">Custo ${firstCost}${
                  maxCost !== firstCost ? `..${maxCost}` : ""
                } shiny • ${duration}</div>
                <div class="legacy-flow-card-stock">No inventário: ${owned}x${escapeHtml(expiresAt)}</div>
                <div class="legacy-flow-card-actions">
                  <input data-building-flow-qty="${escapeHtml(itemKey)}" type="number" min="1" max="999" value="1"
                    class="legacy-input legacy-flow-qty-input" />
                  <button data-building-flow-buy="${escapeHtml(itemKey)}"
                    class="legacy-btn legacy-btn-primary legacy-btn-sm">Comprar</button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  private getStoreFlowItemKeys(mode: StoreFlowMode): string[] {
    const flow = STORE_FLOW_DEFINITIONS[mode];
    if (!flow.itemKeys || flow.itemKeys.length === 0) {
      const dynamicKeys = Object.entries(this.storeCatalogItems)
        .filter(([, item]) => item.a > 0 || item.i === 0)
        .map(([key]) => key);
      return [...new Set([...dynamicKeys, ...Object.keys(STORE_FALLBACK_ITEMS)])].sort();
    }

    return flow.itemKeys
      .map((key) => key.trim().toUpperCase())
      .filter((key) => key.length > 0)
      .filter((key) => this.resolveStoreItemDefinition(key) !== null);
  }

  private resolveStoreItemDefinition(itemKey: string): StoreCatalogItem | StoreFallbackItem | null {
    const key = itemKey.trim().toUpperCase();
    return this.storeCatalogItems[key] ?? STORE_FALLBACK_ITEMS[key] ?? null;
  }

  private getStoreItemOwnedQuantity(itemKey: string): number {
    const key = itemKey.trim().toUpperCase();
    return this.baseState.storeData?.[key]?.q ?? 0;
  }

  private resolveBuildingStoreSku(code: number): string | null {
    const sku = `BUILDING${Math.trunc(code)}`;
    if (this.resolveStoreItemDefinition(sku)) {
      return sku;
    }
    return null;
  }

  private resolveCatalogThumbnailPath(canonicalType: string): string {
    const catalogThumb = resolveBuildingCatalogThumbnailPath(canonicalType);
    if (catalogThumb && catalogThumb !== DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH) {
      return catalogThumb;
    }

    const buildingTexture = resolveBuildingTexturePath(canonicalType);
    return buildingTexture ?? DEFAULT_BUILDING_CATALOG_THUMBNAIL_PATH;
  }

  private async executeStoreFlowPurchase(itemKey: string, quantity: number): Promise<void> {
    const normalizedItem = itemKey.trim().toUpperCase();
    const normalizedQuantity = Math.max(1, Math.min(999, Math.trunc(quantity)));
    this.setBuildingFlowStatus(`Comprando ${normalizedItem} x${normalizedQuantity}...`);

    try {
      const response = await this.deps.api.purchaseStoreItem({
        item: normalizedItem,
        quantity: normalizedQuantity,
      });
      this.applyCmdResponse(response);
      await this.refreshStoreCatalog({ force: true, silentStatus: true });

      const owned = this.getStoreItemOwnedQuantity(normalizedItem);
      this.setBuildingFlowStatus(`Compra concluída: ${normalizedItem} x${normalizedQuantity} (inventário: ${owned}).`);
      this.statusText.text = `Store: compra ok ${normalizedItem} x${normalizedQuantity}.`;

      if (isStoreFlowMode(this.buildingFlowMode)) {
        this.renderStoreFlow(this.buildingFlowMode);
      }
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      this.setBuildingFlowStatus(`Falha na compra (${normalizedItem}): ${message}`);
      this.statusText.text = `Store falhou: ${message}`;
    }

    this.renderBuildingControlPanel();
  }

  private setPlacementType(nextType: string, statusPrefix: string): void {
    const normalized = normalizePlacementBuildingTypeInput(nextType);
    if (!normalized) {
      this.statusText.text = `Tipo inválido: ${nextType}`;
      this.renderBuildingControlPanel();
      return;
    }

    this.placementType = normalized.canonicalType;
    this.queueBuildingTextureLoad(this.placementType);
    const footprint = getLegacyFootprintTilesByType(this.placementType);
    this.statusText.text = `${statusPrefix}: ${this.placementType} (${footprint.width}x${footprint.height})`;
    this.alignCatalogStateToPlacementType(true);

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
  }

  private alignCatalogStateToPlacementType(resetPage: boolean): void {
    const placementInfo = describePlacementType(this.placementType);
    if (!placementInfo) return;

    this.buildingControlTab = placementInfo.tabId;
    if (placementInfo.tabId === "decorations") {
      this.buildingControlSubTab = placementInfo.decorationGroupId ?? "all";
    } else {
      this.buildingControlSubTab = "all";
    }

    if (!resetPage) return;

    const entries = listPlacementTypeCatalogEntriesForTab(
      this.buildingControlTab,
      this.buildingControlSubTab
    );
    const selectedIndex = entries.findIndex(
      (entry) => entry.canonicalType === placementInfo.canonicalType
    );
    this.buildingControlPage =
      selectedIndex >= 0 ? Math.floor(selectedIndex / BUILDING_CATALOG_PAGE_SIZE) : 0;
  }

  private countBuildingCatalogEntriesByCode(): Map<number, number> {
    const counts = new Map<number, number>();

    for (const building of this.baseState.buildings) {
      const normalized = normalizePlacementBuildingTypeInput(building.type);
      const entry = normalized
        ? describePlacementType(normalized.code)
        : describePlacementType(building.type);
      if (!entry) continue;
      counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
    }

    return counts;
  }

  private countResourceBuildings(): number {
    let count = 0;
    for (const building of this.baseState.buildings) {
      const entry = describePlacementType(building.type);
      if (entry?.category === "resource") {
        count += 1;
      }
    }
    return count;
  }

  private countDamagedBuildings(): number {
    let count = 0;
    for (const building of this.baseState.buildings) {
      if (this.isBuildingDamaged(building)) {
        count += 1;
      }
    }
    return count;
  }

  private isBuildingDamaged(building: YardBuilding | null | undefined): boolean {
    if (!building) return false;
    if (typeof building.hp !== "number" || typeof building.maxHp !== "number") {
      return false;
    }
    return building.maxHp > 0 && building.hp >= 0 && building.hp < building.maxHp;
  }

  private promptPlacementType(): void {
    if (this.buildingControlSearchInput) {
      this.toggleBuildingControlPanel(true);
      this.buildingControlSearchInput.focus();
      this.buildingControlSearchInput.select();
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
    this.setPlacementType(nextType, "placeType atualizado");
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

function isBuildingCatalogTabId(value: string): value is BuildingCatalogTabId {
  return (
    value === "resources" ||
    value === "buildings" ||
    value === "defensive" ||
    value === "decorations"
  );
}

function isBuildingCatalogSubTabId(value: string): value is BuildingCatalogSubTabId {
  return (
    value === "all" ||
    value === "evil" ||
    value === "plants" ||
    value === "good" ||
    value === "flags" ||
    value === "premium"
  );
}

function getViewportSize(): { width: number; height: number } {
  return {
    width: LEGACY_SCREEN_INIT_WIDTH,
    height: LEGACY_SCREEN_INIT_HEIGHT,
  };
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

function parseIntSafe(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function isStoreFlowMode(mode: BuildingFlowMode | null): mode is StoreFlowMode {
  return (
    mode === "store" ||
    mode === "hatchery" ||
    mode === "bunker" ||
    mode === "lockers" ||
    mode === "juice" ||
    mode === "housing" ||
    mode === "baiter"
  );
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.trunc(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function calculateAcademyTimeSpeedupCost(seconds: number): number {
  const clampedSeconds = Math.max(0, Math.trunc(seconds));
  if (clampedSeconds <= 0) return 0;

  const linearCost = Math.ceil((clampedSeconds * 20) / 60 / 60);
  const sqrtCost = Math.trunc(Math.sqrt(clampedSeconds * 0.8));
  return Math.max(0, Math.min(linearCost, sqrtCost));
}

function calculateAcademyResourceSpeedupCost(resourceCost: number): number {
  const clampedResourceCost = Math.max(0, Math.trunc(resourceCost));
  if (clampedResourceCost <= 0) return 0;
  return Math.ceil(Math.pow(Math.sqrt(clampedResourceCost / 2), 0.75));
}

function normalizeStoreDataEntries(
  raw: Record<string, { q: number; e?: number }>
): Record<string, StoreInventoryEntry> {
  const normalized: Record<string, StoreInventoryEntry> = {};

  for (const [rawKey, rawEntry] of Object.entries(raw)) {
    const key = rawKey.trim().toUpperCase();
    if (!key) continue;

    const quantity = parseIntSafe(rawEntry?.q, Number.NaN);
    if (!Number.isFinite(quantity) || quantity < 0) continue;

    const expiresAt = parseIntSafe(rawEntry?.e, Number.NaN);
    normalized[key] = {
      q: quantity,
      ...(Number.isFinite(expiresAt) && expiresAt >= 0 ? { e: expiresAt } : {}),
    };
  }

  return normalized;
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
