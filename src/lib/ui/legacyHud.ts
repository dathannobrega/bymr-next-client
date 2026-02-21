import type { BaseResourceSummary } from "../base/baseLoad";

type LegacyHudDeps = {
  onOpenBuildOps: () => void;
  onOpenStore: () => void;
  onOpenMaproom: () => void;
  onOpenSocial: () => void;
  onToggleZoom: () => void;
  onCenterYard: () => void;
  onCollectAll: () => void;
};

type LegacyHudCounterKey = "gift" | "inbox" | "alert";

export type LegacyHudCounters = Partial<Record<LegacyHudCounterKey, number>>;

export class LegacyHud {
  private root: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;
  private resourceValueEls = new Map<string, HTMLSpanElement>();
  private counterEls = new Map<LegacyHudCounterKey, HTMLSpanElement>();

  constructor(private readonly deps: LegacyHudDeps) {
    if (typeof document === "undefined") {
      return;
    }
    this.ensureDom();
  }

  setVisible(visible: boolean): void {
    if (!this.root) return;
    this.root.style.display = visible ? "block" : "none";
  }

  updateResources(resources: BaseResourceSummary | undefined, credits: number | undefined): void {
    this.setResourceValue("r1", formatResource(resources?.r1, resources?.r1max));
    this.setResourceValue("r2", formatResource(resources?.r2, resources?.r2max));
    this.setResourceValue("r3", formatResource(resources?.r3, resources?.r3max));
    this.setResourceValue("r4", formatResource(resources?.r4, resources?.r4max));
    this.setResourceValue("credits", formatCredits(credits));
  }

  updateStatus(text: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = text.trim().length > 0 ? text : "Ready.";
  }

  updateCounters(counters: LegacyHudCounters): void {
    this.updateCounter("gift", counters.gift);
    this.updateCounter("inbox", counters.inbox);
    this.updateCounter("alert", counters.alert);
  }

  dispose(): void {
    if (this.root?.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
    this.root = null;
    this.statusEl = null;
    this.resourceValueEls.clear();
    this.counterEls.clear();
  }

  private ensureDom(): void {
    if (this.root || typeof document === "undefined") return;

    const root = document.createElement("div");
    root.className = "legacy-hud-root";
    root.innerHTML = `
      <div class="legacy-hud-top">
        <div class="legacy-hud-brand">BACKYARD MONSTERS</div>
        <div class="legacy-hud-resources">
          ${renderResource("r1", "Twigs")}
          ${renderResource("r2", "Pebbles")}
          ${renderResource("r3", "Putty")}
          ${renderResource("r4", "Goo")}
          ${renderResource("credits", "Shiny")}
        </div>
        <div class="legacy-hud-quick">
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="invite">Invite</button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="gift">Gift <span data-legacy-hud-counter="gift" class="legacy-hud-counter">0</span></button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="inbox">Inbox <span data-legacy-hud-counter="inbox" class="legacy-hud-counter">0</span></button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="alert">Alert <span data-legacy-hud-counter="alert" class="legacy-hud-counter">0</span></button>
        </div>
        <div class="legacy-hud-system">
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="zoom">Zoom</button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="center">Center</button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="help">Help</button>
          <button type="button" class="legacy-hud-icon-btn" data-legacy-hud-action="fullscreen" title="Fullscreen">
            <span class="legacy-hud-fullscreen-icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="legacy-hud-statusline" data-legacy-hud-status>Ready.</div>
      <div class="legacy-hud-bottom">
        <button type="button" class="legacy-hud-menu-btn" data-legacy-hud-action="build">Buildings</button>
        <button type="button" class="legacy-hud-menu-btn" data-legacy-hud-action="store">Store</button>
        <button type="button" class="legacy-hud-menu-btn" data-legacy-hud-action="map">Map</button>
        <button type="button" class="legacy-hud-menu-btn" data-legacy-hud-action="social">Social</button>
        <button type="button" class="legacy-hud-menu-btn" data-legacy-hud-action="collect">Collect All</button>
      </div>
    `;

    root.querySelectorAll<HTMLSpanElement>("[data-legacy-resource-key]").forEach((el) => {
      const key = el.dataset.legacyResourceKey?.trim();
      if (!key) return;
      this.resourceValueEls.set(key, el);
    });

    root.querySelectorAll<HTMLSpanElement>("[data-legacy-hud-counter]").forEach((el) => {
      const key = el.dataset.legacyHudCounter as LegacyHudCounterKey | undefined;
      if (!key) return;
      this.counterEls.set(key, el);
    });

    root.querySelectorAll<HTMLButtonElement>("[data-legacy-hud-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.legacyHudAction;
        switch (action) {
          case "build":
            this.deps.onOpenBuildOps();
            return;
          case "store":
            this.deps.onOpenStore();
            return;
          case "map":
            this.deps.onOpenMaproom();
            return;
          case "social":
            this.deps.onOpenSocial();
            return;
          case "collect":
            this.deps.onCollectAll();
            return;
          case "zoom":
            this.deps.onToggleZoom();
            return;
          case "center":
            this.deps.onCenterYard();
            return;
          case "help":
          case "invite":
          case "gift":
          case "inbox":
          case "alert":
            this.deps.onOpenSocial();
            return;
          case "fullscreen":
            void toggleFullscreen();
            return;
        }
      });
    });

    this.statusEl = root.querySelector<HTMLDivElement>("[data-legacy-hud-status]");
    document.body.appendChild(root);
    this.root = root;
  }

  private setResourceValue(key: string, value: string): void {
    const target = this.resourceValueEls.get(key);
    if (!target) return;
    target.textContent = value;
  }

  private updateCounter(key: LegacyHudCounterKey, value: number | undefined): void {
    const target = this.counterEls.get(key);
    if (!target) return;

    const normalized = Number.isFinite(value) && (value as number) > 0 ? Math.trunc(value as number) : 0;
    target.textContent = normalized > 99 ? "99+" : String(normalized);
    target.style.display = normalized > 0 ? "inline-flex" : "none";
  }
}

function renderResource(key: string, label: string): string {
  return `
    <div class="legacy-hud-resource-pill">
      <span class="legacy-hud-resource-label">${label}</span>
      <span class="legacy-hud-resource-value" data-legacy-resource-key="${key}">0</span>
    </div>
  `;
}

function formatResource(value: number | undefined, max: number | undefined): string {
  if (!Number.isFinite(value) || !Number.isFinite(max)) return "n/a";
  return `${formatNumber(value as number)}/${formatNumber(max as number)}`;
}

function formatCredits(value: number | undefined): string {
  if (!Number.isFinite(value)) return "n/a";
  return formatNumber(value as number);
}

function formatNumber(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString("en-US");
}

async function toggleFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      // noop
    }
    return;
  }

  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // noop
  }
}
