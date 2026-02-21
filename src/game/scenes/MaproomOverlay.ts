import type { ApiClient, StateStreamSubscription } from "../../lib/api/client";
import type { WorldmapBookmark, WorldmapV3Cell } from "../../lib/contracts/maproom";

type Viewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TransferEndpoint = {
  baseId: string;
  x: number;
  y: number;
  monsters: unknown[];
};

export type MaproomCellFilterMode =
  | "all"
  | "mine"
  | "enemy"
  | "free"
  | "damaged"
  | "protected";

export type MaproomCellRole = "mine" | "enemy" | "free";

const MAPROOM_MAX_COORD = 799;
const DEFAULT_VIEWPORT_SIZE = 11;
const MAX_BOOKMARKS = 200;
const MAX_VISIBLE_LIST_ITEMS = 40;

export class MaproomOverlay {
  private wrapper: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;
  private gridEl: HTMLDivElement | null = null;
  private selectionEl: HTMLDivElement | null = null;
  private detailsEl: HTMLDivElement | null = null;
  private bookmarksEl: HTMLDivElement | null = null;
  private visibleListEl: HTMLDivElement | null = null;

  private takeoverShinyInput: HTMLInputElement | null = null;
  private takeoverResourcesInput: HTMLInputElement | null = null;
  private bookmarkNameInput: HTMLInputElement | null = null;
  private bookmarkSearchInput: HTMLInputElement | null = null;
  private jumpXInput: HTMLInputElement | null = null;
  private jumpYInput: HTMLInputElement | null = null;
  private filterSelect: HTMLSelectElement | null = null;

  private visible = false;
  private loading = false;
  private currentUserId: number | null = null;
  private homeCell: WorldmapV3Cell | null = null;
  private cells: WorldmapV3Cell[] = [];
  private selectedCoord: { x: number; y: number } | null = null;
  private transferSource: TransferEndpoint | null = null;
  private transferTarget: TransferEndpoint | null = null;
  private bookmarks: WorldmapBookmark[] = [];
  private bookmarkSearchQuery = "";
  private cellFilter: MaproomCellFilterMode = "all";
  private combatReplaySummary: string | null = null;
  private combatReplaySubscription: StateStreamSubscription | null = null;
  private viewport: Viewport = {
    x: 0,
    y: 0,
    width: DEFAULT_VIEWPORT_SIZE,
    height: DEFAULT_VIEWPORT_SIZE,
  };

  constructor(private readonly api: ApiClient) {
    this.ensureDom();
  }

  toggle(): void {
    if (this.visible) {
      this.close();
      return;
    }

    void this.open();
  }

  close(): void {
    this.visible = false;
    this.stopCombatReplayStream();
    if (this.wrapper) {
      this.wrapper.style.display = "none";
    }
  }

  async open(): Promise<void> {
    this.ensureDom();
    if (!this.wrapper) return;

    this.visible = true;
    this.wrapper.style.display = "block";
    await this.refreshAll();
  }

  private ensureDom(): void {
    if (this.wrapper) return;

    const wrapper = document.createElement("div");
    wrapper.className = "legacy-window legacy-window-maproom";
    wrapper.dataset.legacyTheme = "active";
    wrapper.dataset.legacyFrame = "frame3";
    wrapper.style.display = "none";

    wrapper.innerHTML = `
      <div class="legacy-window-header">
        <strong class="legacy-window-title">Maproom v3</strong>
        <button data-maproom-close class="legacy-btn legacy-btn-ghost">Fechar (M)</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <button data-maproom-refresh class="legacy-btn legacy-btn-primary">Atualizar</button>
        <button data-maproom-relocate class="legacy-btn legacy-btn-positive">Relocar base</button>
        <button data-maproom-up class="legacy-btn legacy-btn-ghost legacy-maproom-dir-btn">↑</button>
        <button data-maproom-left class="legacy-btn legacy-btn-ghost legacy-maproom-dir-btn">←</button>
        <button data-maproom-right class="legacy-btn legacy-btn-ghost legacy-maproom-dir-btn">→</button>
        <button data-maproom-down class="legacy-btn legacy-btn-ghost legacy-maproom-dir-btn">↓</button>
        <button data-maproom-center class="legacy-btn legacy-btn-ghost">Centralizar</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <select data-maproom-filter class="legacy-input legacy-maproom-filter">
          <option value="all">Filtro: Todas</option>
          <option value="mine">Filtro: Minhas</option>
          <option value="enemy">Filtro: Inimigas</option>
          <option value="free">Filtro: Livres</option>
          <option value="damaged">Filtro: Danificadas</option>
          <option value="protected">Filtro: Protegidas</option>
        </select>
        <input data-maproom-jump-x type="number" min="0" max="799" placeholder="X" class="legacy-input legacy-maproom-jump-input" />
        <input data-maproom-jump-y type="number" min="0" max="799" placeholder="Y" class="legacy-input legacy-maproom-jump-input" />
        <button data-maproom-jump class="legacy-btn legacy-btn-primary">Ir para coord</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <input
          data-maproom-takeover-shiny
          type="number"
          min="1"
          placeholder="Shiny takeover"
          class="legacy-input legacy-maproom-shiny-input"
        />
        <input
          data-maproom-takeover-resources
          placeholder='Recursos takeover {"r1":1000}'
          class="legacy-input legacy-input-wide legacy-maproom-resources-input"
        />
        <button data-maproom-takeover class="legacy-btn legacy-btn-danger">Takeover selecionada</button>
        <button data-maproom-start-replay class="legacy-btn legacy-btn-primary">Iniciar replay</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <button data-maproom-mark-source class="legacy-btn legacy-btn-primary">Definir origem transf.</button>
        <button data-maproom-mark-target class="legacy-btn legacy-btn-primary">Definir destino transf.</button>
        <button data-maproom-transfer class="legacy-btn legacy-btn-positive">Transferir todos</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <input data-maproom-bookmark-name placeholder="Nome do bookmark" class="legacy-input legacy-maproom-bookmark-name" />
        <button data-maproom-bookmark-add class="legacy-btn legacy-btn-primary">Salvar bookmark</button>
        <input data-maproom-bookmark-search placeholder="Filtrar bookmarks" class="legacy-input legacy-maproom-bookmark-search" />
      </div>

      <div data-maproom-selection class="legacy-muted-text legacy-maproom-selection"></div>
      <div data-maproom-status class="legacy-muted-text legacy-maproom-status"></div>
      <div data-maproom-details class="legacy-info-box legacy-maproom-details"></div>
      <div data-maproom-grid class="legacy-maproom-panel-block"></div>
      <div data-maproom-visible-list class="legacy-maproom-panel-block"></div>
      <div data-maproom-bookmarks></div>
    `;

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-close]")?.addEventListener("click", () => {
      this.close();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-refresh]")?.addEventListener("click", () => {
      void this.refreshCellsOnly();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-relocate]")?.addEventListener("click", () => {
      void this.relocateAndRefresh();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-up]")?.addEventListener("click", () => {
      void this.shiftViewport(0, -3);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-left]")?.addEventListener("click", () => {
      void this.shiftViewport(-3, 0);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-right]")?.addEventListener("click", () => {
      void this.shiftViewport(3, 0);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-down]")?.addEventListener("click", () => {
      void this.shiftViewport(0, 3);
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-center]")?.addEventListener("click", () => {
      void this.centerOnHome();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-jump]")?.addEventListener("click", () => {
      void this.jumpToCoordinates();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-takeover]")?.addEventListener("click", () => {
      void this.takeoverSelectedCell();
    });
    wrapper.querySelector<HTMLButtonElement>("[data-maproom-start-replay]")?.addEventListener("click", () => {
      void this.startCombatReplayForSelectedCell();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-mark-source]")?.addEventListener("click", () => {
      this.markTransferEndpoint("source");
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-mark-target]")?.addEventListener("click", () => {
      this.markTransferEndpoint("target");
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-transfer]")?.addEventListener("click", () => {
      void this.transferAllMonsters();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-maproom-bookmark-add]")?.addEventListener("click", () => {
      void this.saveBookmarkFromSelection();
    });

    this.statusEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-status]");
    this.gridEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-grid]");
    this.selectionEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-selection]");
    this.detailsEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-details]");
    this.bookmarksEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-bookmarks]");
    this.visibleListEl = wrapper.querySelector<HTMLDivElement>("[data-maproom-visible-list]");

    this.takeoverShinyInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-takeover-shiny]");
    this.takeoverResourcesInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-takeover-resources]");
    this.bookmarkNameInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-bookmark-name]");
    this.bookmarkSearchInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-bookmark-search]");
    this.jumpXInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-jump-x]");
    this.jumpYInput = wrapper.querySelector<HTMLInputElement>("[data-maproom-jump-y]");
    this.filterSelect = wrapper.querySelector<HTMLSelectElement>("[data-maproom-filter]");

    this.filterSelect?.addEventListener("change", () => {
      const nextFilter = this.filterSelect?.value as MaproomCellFilterMode | undefined;
      if (!nextFilter) return;

      this.cellFilter = nextFilter;
      this.renderGrid();
      this.renderSelectionSummary();
      this.renderVisibleCellsPanel();
    });

    this.bookmarkSearchInput?.addEventListener("input", () => {
      this.bookmarkSearchQuery = this.bookmarkSearchInput?.value.trim() ?? "";
      this.renderBookmarksPanel();
    });

    const onJumpEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.jumpToCoordinates();
    };
    this.jumpXInput?.addEventListener("keydown", onJumpEnter);
    this.jumpYInput?.addEventListener("keydown", onJumpEnter);

    this.wrapper = wrapper;
    document.body.appendChild(wrapper);

    this.renderSelectionSummary();
    this.renderDetailsPanel();
    this.renderVisibleCellsPanel();
    this.renderBookmarksPanel();
  }

  private async refreshAll(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    let shouldRefreshCells = false;
    this.setStatus("Carregando dados da Maproom...");

    try {
      const init = await this.api.worldmapInitV3();
      this.homeCell = init.celldata[0] ?? null;
      this.currentUserId = this.homeCell?.uid ?? null;
      this.bookmarks = normalizeBookmarksFromServer(init.bookmarks);

      if (this.homeCell) {
        this.viewport = centeredViewport(
          this.homeCell.x,
          this.homeCell.y,
          this.viewport.width,
          this.viewport.height
        );
        this.selectedCoord = { x: this.homeCell.x, y: this.homeCell.y };
      }

      this.transferSource = null;
      this.transferTarget = null;
      shouldRefreshCells = true;
    } catch (error) {
      this.setStatus(`Falha ao carregar maproom: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
      this.renderSelectionSummary();
      this.renderDetailsPanel();
      this.renderVisibleCellsPanel();
      this.renderBookmarksPanel();
    }

    if (shouldRefreshCells) {
      await this.refreshCellsOnly();
    }
  }

  private async refreshCellsOnly(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    this.setStatus(`Carregando células (${this.viewport.x}, ${this.viewport.y})...`);

    try {
      const response = await this.api.worldmapGetCellsV3(this.viewport);
      this.cells = response.celldata;
      this.renderGrid();
      this.renderSelectionSummary();
      this.renderDetailsPanel();
      this.renderVisibleCellsPanel();
      this.setStatus(
        `Células carregadas: ${this.cells.length} | viewport=(${response.x},${response.y}) ${response.width}x${response.height}`
      );
    } catch (error) {
      this.setStatus(`Falha ao carregar células: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
    }
  }

  private async relocateAndRefresh(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    let shouldRefreshCells = false;
    this.setStatus("Relocando base...");

    try {
      const response = await this.api.worldmapRelocateV3();
      this.homeCell = {
        ...(this.homeCell ?? fallbackHomeCell()),
        x: response.coords[0],
        y: response.coords[1],
      };
      this.selectedCoord = { x: response.coords[0], y: response.coords[1] };
      this.viewport = centeredViewport(
        response.coords[0],
        response.coords[1],
        this.viewport.width,
        this.viewport.height
      );
      this.transferSource = null;
      this.transferTarget = null;
      shouldRefreshCells = true;
      this.setStatus(`Relocação concluída para (${response.coords[0]}, ${response.coords[1]}).`);
    } catch (error) {
      this.setStatus(`Falha ao relocar base: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
      this.renderSelectionSummary();
      this.renderDetailsPanel();
    }

    if (shouldRefreshCells) {
      await this.refreshCellsOnly();
    }
  }

  private async shiftViewport(dx: number, dy: number): Promise<void> {
    this.viewport = normalizedViewport({
      ...this.viewport,
      x: this.viewport.x + dx,
      y: this.viewport.y + dy,
    });

    await this.refreshCellsOnly();
  }

  private async centerOnHome(): Promise<void> {
    if (!this.homeCell) {
      this.setStatus("Base principal ainda não carregada.");
      return;
    }

    this.selectedCoord = { x: this.homeCell.x, y: this.homeCell.y };
    this.viewport = centeredViewport(
      this.homeCell.x,
      this.homeCell.y,
      this.viewport.width,
      this.viewport.height
    );
    await this.refreshCellsOnly();
  }

  private async jumpToCoordinates(): Promise<void> {
    const parsed = parseMaproomJumpInput(
      this.jumpXInput?.value ?? "",
      this.jumpYInput?.value ?? "",
      MAPROOM_MAX_COORD
    );

    if (!parsed) {
      this.setStatus("Coordenadas inválidas. Informe X e Y entre 0 e 799.");
      return;
    }

    this.selectedCoord = parsed;
    this.viewport = centeredViewport(parsed.x, parsed.y, this.viewport.width, this.viewport.height);
    await this.refreshCellsOnly();
  }

  private renderGrid(): void {
    if (!this.gridEl) return;

    const byCoord = new Map<string, WorldmapV3Cell>();
    this.cells.forEach((cell) => {
      byCoord.set(`${cell.x}:${cell.y}`, cell);
    });

    const rows: string[] = [];

    for (let y = this.viewport.y; y < this.viewport.y + this.viewport.height; y += 1) {
      const cols: string[] = [];
      for (let x = this.viewport.x; x < this.viewport.x + this.viewport.width; x += 1) {
        const cell = byCoord.get(`${x}:${y}`);
        const isHome = this.homeCell?.x === x && this.homeCell?.y === y;
        const isSelected = this.selectedCoord?.x === x && this.selectedCoord?.y === y;
        const hasBase = Boolean(cell?.uid);
        const role = classifyMaproomCell(cell, this.currentUserId);
        const visibleInFilter = matchesCellFilter(cell, this.currentUserId, this.cellFilter);

        const cellClasses = ["legacy-maproom-cell", `is-role-${role}`];
        if (isHome) cellClasses.push("is-home");
        if (isSelected) cellClasses.push("is-selected");
        if (!visibleInFilter) cellClasses.push("is-filtered");
        const label = cell?.uid
          ? `${escapeHtml(cell.n)} Lv.${cell.l}${role === "mine" ? " (você)" : ""}`
          : "Livre";
        const subLabel = !visibleInFilter
          ? `<div class="legacy-maproom-cell-note is-filtered">Filtrado</div>`
          : cell?.dm
            ? `<div class="legacy-maproom-cell-note is-damaged">dano=${cell.dm}%</div>`
            : cell?.p
              ? `<div class="legacy-maproom-cell-note is-protected">protegida</div>`
              : "";

        cols.push(
          `<td data-maproom-cell="${x}:${y}" class="${cellClasses.join(" ")}">
            <div class="legacy-maproom-cell-coord">${x},${y}${isHome ? " ★" : ""}</div>
            <div class="legacy-maproom-cell-label${hasBase ? " has-base" : ""}">${label}</div>
            ${cell?.bid ? `<div class="legacy-maproom-cell-base">base=${escapeHtml(cell.bid)}</div>` : ""}
            ${subLabel}
          </td>`
        );
      }
      rows.push(`<tr>${cols.join("")}</tr>`);
    }

    this.gridEl.innerHTML = `
      <div class="legacy-maproom-grid-wrap">
        <table class="legacy-maproom-grid-table">${rows.join("")}</table>
      </div>
    `;

    this.gridEl.querySelectorAll<HTMLTableCellElement>("[data-maproom-cell]").forEach((cellEl) => {
      cellEl.addEventListener("click", () => {
        const raw = cellEl.dataset.maproomCell;
        if (!raw) return;

        const parsed = parseCoord(raw);
        if (!parsed) return;

        this.selectedCoord = parsed;
        this.renderGrid();
        this.renderSelectionSummary();
        this.renderDetailsPanel();
      });
    });
  }

  private renderSelectionSummary(): void {
    if (!this.selectionEl) return;

    const selected = this.getSelectedCell();
    const coordText = this.selectedCoord
      ? `Selecionada: (${this.selectedCoord.x}, ${this.selectedCoord.y})`
      : "Selecionada: nenhuma";

    let selectedCellText = "";
    if (selected) {
      const role = classifyMaproomCell(selected, this.currentUserId);
      selectedCellText = ` • base=${selected.bid} • owner=${escapeHtml(selected.n)} • role=${role}`;
    } else if (this.selectedCoord) {
      selectedCellText = " • célula livre ou fora do recorte carregado";
    }

    const sourceText = this.transferSource
      ? `Origem: ${this.transferSource.baseId} (${this.transferSource.x},${this.transferSource.y})`
      : "Origem: —";
    const targetText = this.transferTarget
      ? `Destino: ${this.transferTarget.baseId} (${this.transferTarget.x},${this.transferTarget.y})`
      : "Destino: —";

    this.selectionEl.textContent = `${coordText}${selectedCellText} | filtro=${this.cellFilter} | ${sourceText} | ${targetText}`;
  }

  private renderDetailsPanel(): void {
    if (!this.detailsEl) return;

    if (!this.selectedCoord) {
      this.detailsEl.textContent = "Selecione uma célula para visualizar detalhes e ações disponíveis.";
      return;
    }

    const selected = this.getSelectedCell();
    if (!selected) {
      this.detailsEl.innerHTML = `
        <div class="legacy-maproom-details-title"><strong>Célula (${this.selectedCoord.x}, ${this.selectedCoord.y})</strong></div>
        <div class="legacy-maproom-details-note">Sem dados de base nesta janela (provavelmente célula livre).</div>
      `;
      return;
    }

    const role = classifyMaproomCell(selected, this.currentUserId);
    const monsterCount = toMonsterList(selected.m)?.length;
    const resourcesSummary = summarizeResourceBag(selected.r);

    const actionLines: string[] = [];
    if (role === "enemy") {
      actionLines.push("Takeover: disponível (se célula estiver elegível no servidor). ");
      actionLines.push("Replay: disponível via botão 'Iniciar replay'. ");
    }
    if (role === "mine") {
      actionLines.push("Transferência: pode ser usada como origem/destino.");
    }
    if (role === "free") {
      actionLines.push("Célula livre: nenhuma ação de takeover/transfer aplicável.");
    }

    this.detailsEl.innerHTML = `
      <div class="legacy-maproom-details-title"><strong>Detalhes da célula selecionada</strong></div>
      <div>Coord: (${selected.x}, ${selected.y}) • Base: ${escapeHtml(selected.bid)} • Dono: ${escapeHtml(selected.n)} (uid=${selected.uid})</div>
      <div>Role: ${role} • Lv.${selected.l} • Dano=${selected.dm}% • Protegida=${selected.p ? "sim" : "não"}</div>
      <div>Monstros: ${typeof monsterCount === "number" ? String(monsterCount) : "n/a"}</div>
      <div>Recursos: ${resourcesSummary}</div>
      <div class="legacy-maproom-details-note">${actionLines.join(" ") || "Ações dependem do estado do servidor."}</div>
      <div class="legacy-maproom-details-replay">Replay: ${escapeHtml(this.combatReplaySummary ?? "nenhum ativo")}</div>
    `;
  }

  private renderVisibleCellsPanel(): void {
    if (!this.visibleListEl) return;

    const visibleCells = this.cells
      .filter((cell) => matchesCellFilter(cell, this.currentUserId, this.cellFilter))
      .sort((a, b) => compareCellsForVisiblePanel(a, b, this.currentUserId))
      .slice(0, MAX_VISIBLE_LIST_ITEMS);

    if (visibleCells.length === 0) {
      this.visibleListEl.innerHTML =
        '<div class="legacy-empty-state">Nenhuma célula visível para o filtro atual nesta viewport.</div>';
      return;
    }

    const rows = visibleCells
      .map((cell) => {
        const role = classifyMaproomCell(cell, this.currentUserId);
        const damage = cell.dm > 0 ? ` • dano=${cell.dm}%` : "";
        const protection = cell.p ? " • protegida" : "";

        return `
          <div class="legacy-maproom-list-row">
            <button data-maproom-visible-select="${cell.x}:${cell.y}" class="legacy-btn legacy-btn-ghost legacy-btn-sm">Selecionar</button>
            <span class="legacy-maproom-list-text">(${cell.x},${cell.y}) • ${escapeHtml(cell.n)} • base=${escapeHtml(cell.bid)} • role=${role}${damage}${protection}</span>
          </div>
        `;
      })
      .join("");

    this.visibleListEl.innerHTML =
      `<div class="legacy-maproom-list-header">Células no filtro (${visibleCells.length}):</div>${rows}`;

    this.visibleListEl
      .querySelectorAll<HTMLButtonElement>("[data-maproom-visible-select]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const raw = button.dataset.maproomVisibleSelect;
          if (!raw) return;

          const parsed = parseCoord(raw);
          if (!parsed) return;

          this.selectedCoord = parsed;
          this.renderGrid();
          this.renderSelectionSummary();
          this.renderDetailsPanel();
        });
      });
  }

  private renderBookmarksPanel(): void {
    if (!this.bookmarksEl) return;

    if (this.bookmarks.length === 0) {
      this.bookmarksEl.innerHTML = '<div class="legacy-empty-state">Bookmarks: nenhum salvo.</div>';
      return;
    }

    const query = normalizeSearch(this.bookmarkSearchQuery);
    const filtered = this.bookmarks.filter((bookmark) => {
      if (!query) return true;

      const haystack = normalizeSearch(
        `${bookmark.name} ${bookmark.bid ?? ""} ${bookmark.x},${bookmark.y}`
      );
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      this.bookmarksEl.innerHTML =
        '<div class="legacy-empty-state">Nenhum bookmark para o filtro informado.</div>';
      return;
    }

    const rows = filtered
      .map((bookmark) => {
        const baseText = bookmark.bid ? ` • base=${escapeHtml(bookmark.bid)}` : "";
        return `
          <div class="legacy-maproom-list-row">
            <button data-maproom-bookmark-goto="${escapeHtml(bookmark.id)}" class="legacy-btn legacy-btn-ghost legacy-btn-sm">Ir</button>
            <button data-maproom-bookmark-remove="${escapeHtml(bookmark.id)}" class="legacy-btn legacy-btn-danger legacy-btn-sm">Remover</button>
            <span class="legacy-maproom-list-text">${escapeHtml(bookmark.name)} (${bookmark.x},${bookmark.y})${baseText}</span>
          </div>
        `;
      })
      .join("");

    this.bookmarksEl.innerHTML =
      `<div class="legacy-maproom-list-header">Bookmarks (${filtered.length}/${this.bookmarks.length}):</div>${rows}`;

    this.bookmarksEl
      .querySelectorAll<HTMLButtonElement>("[data-maproom-bookmark-goto]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.maproomBookmarkGoto;
          if (!id) return;
          void this.gotoBookmark(id);
        });
      });

    this.bookmarksEl
      .querySelectorAll<HTMLButtonElement>("[data-maproom-bookmark-remove]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.maproomBookmarkRemove;
          if (!id) return;
          void this.removeBookmark(id);
        });
      });
  }

  private getSelectedCell(): WorldmapV3Cell | null {
    if (!this.selectedCoord) return null;

    return (
      this.cells.find(
        (cell) => cell.x === this.selectedCoord?.x && cell.y === this.selectedCoord?.y
      ) ?? null
    );
  }

  private markTransferEndpoint(kind: "source" | "target"): void {
    const selected = this.getSelectedCell();
    if (!selected || !selected.uid || !selected.bid) {
      this.setStatus("Selecione uma célula ocupada para definir origem/destino.");
      return;
    }

    if (this.currentUserId !== null && selected.uid !== this.currentUserId) {
      this.setStatus("Transferência só é permitida entre bases suas.");
      return;
    }

    const monsters = toMonsterList(selected.m);
    if (!monsters) {
      this.setStatus(
        `Base ${selected.bid} não expõe lista de monstros transferível neste payload (formato legado incompatível).`
      );
      return;
    }

    const endpoint: TransferEndpoint = {
      baseId: selected.bid,
      x: selected.x,
      y: selected.y,
      monsters,
    };

    if (kind === "source") {
      this.transferSource = endpoint;
      this.setStatus(`Origem definida: ${selected.bid} (${selected.x}, ${selected.y})`);
    } else {
      this.transferTarget = endpoint;
      this.setStatus(`Destino definido: ${selected.bid} (${selected.x}, ${selected.y})`);
    }

    this.renderSelectionSummary();
    this.renderDetailsPanel();
  }

  private async transferAllMonsters(): Promise<void> {
    if (this.loading) return;

    if (!this.transferSource || !this.transferTarget) {
      this.setStatus("Defina origem e destino antes de transferir.");
      return;
    }

    if (this.transferSource.baseId === this.transferTarget.baseId) {
      this.setStatus("Origem e destino de transferência devem ser bases diferentes.");
      return;
    }

    this.loading = true;
    let shouldRefreshCells = false;
    const movedCount = this.transferSource.monsters.length;
    this.setStatus(
      `Transferindo ${movedCount} registros de monstros de ${this.transferSource.baseId} para ${this.transferTarget.baseId}...`
    );

    try {
      const nextTargetMonsters = [...this.transferTarget.monsters, ...this.transferSource.monsters];
      const response = await this.api.worldmapTransferAssetsV2({
        fromBaseId: this.transferSource.baseId,
        toBaseId: this.transferTarget.baseId,
        fromMonsters: [],
        toMonsters: nextTargetMonsters,
      });

      if (!isLegacyOk(response.error)) {
        throw new Error(`transferassets retornou erro=${String(response.error)}`);
      }

      this.transferSource = {
        ...this.transferSource,
        monsters: [],
      };
      this.transferTarget = {
        ...this.transferTarget,
        monsters: nextTargetMonsters,
      };

      shouldRefreshCells = true;
      this.setStatus(`Transferência concluída: ${movedCount} registros movidos.`);
    } catch (error) {
      this.setStatus(`Falha na transferência: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
      this.renderSelectionSummary();
      this.renderDetailsPanel();
    }

    if (shouldRefreshCells) {
      await this.refreshCellsOnly();
    }
  }

  private async takeoverSelectedCell(): Promise<void> {
    if (this.loading) return;

    const selected = this.getSelectedCell();
    if (!selected || !selected.uid || !selected.bid) {
      this.setStatus("Selecione uma célula ocupada para takeover.");
      return;
    }

    if (this.currentUserId !== null && selected.uid === this.currentUserId) {
      this.setStatus("Não é possível takeover da sua própria base.");
      return;
    }

    const shiny = parsePositiveInt(this.takeoverShinyInput?.value ?? "");
    let resources: Record<string, number> | undefined;

    const resourcesRaw = this.takeoverResourcesInput?.value.trim() ?? "";
    if (resourcesRaw.length > 0) {
      try {
        const parsed = JSON.parse(resourcesRaw);
        if (!isRecord(parsed)) {
          throw new Error("Formato de recursos inválido");
        }

        const normalized: Record<string, number> = {};
        for (const [key, value] of Object.entries(parsed)) {
          const amount = parsePositiveInt(String(value));
          if (amount !== undefined) {
            normalized[key] = amount;
          }
        }

        if (Object.keys(normalized).length === 0) {
          throw new Error("Nenhum recurso positivo encontrado");
        }

        resources = normalized;
      } catch (error) {
        this.setStatus(`JSON de recursos inválido: ${String((error as Error)?.message ?? error)}`);
        return;
      }
    }

    if (shiny === undefined && !resources) {
      this.setStatus("Informe shiny (>0) ou recursos em JSON para takeover.");
      return;
    }

    this.loading = true;
    let shouldRefreshCells = false;
    this.setStatus(`Executando takeover de ${selected.bid}...`);

    try {
      const response = await this.api.worldmapTakeoverCellV2({
        baseId: selected.bid,
        ...(shiny !== undefined ? { shiny } : {}),
        ...(resources ? { resources } : {}),
      });

      if (!isLegacyOk(response.error)) {
        throw new Error(`takeoverCell retornou erro=${String(response.error)}`);
      }

      shouldRefreshCells = true;
      this.setStatus(`Takeover concluído para base ${selected.bid}.`);
    } catch (error) {
      this.setStatus(`Falha no takeover: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
    }

    if (shouldRefreshCells) {
      await this.refreshCellsOnly();
    }
  }

  private async startCombatReplayForSelectedCell(): Promise<void> {
    if (this.loading) return;

    const selected = this.getSelectedCell();
    if (!selected || !selected.uid || !selected.bid) {
      this.setStatus("Selecione uma base inimiga para iniciar replay.");
      return;
    }

    if (this.currentUserId !== null && selected.uid === this.currentUserId) {
      this.setStatus("Replay de combate exige base inimiga.");
      return;
    }

    this.stopCombatReplayStream();
    this.combatReplaySummary = "iniciando replay...";
    this.renderDetailsPanel();
    this.setStatus(`Iniciando replay autoritativo contra base ${selected.bid}...`);

    try {
      const start = await this.api.startCombatReplay({
        targetBaseId: selected.bid,
        durationSec: 30,
        tickMs: 300,
        idempotencyKey: buildReplayIdempotencyKey(selected.bid),
      });

      this.combatReplaySummary =
        `replay ${start.replayId.slice(0, 8)} aberto (${start.totalTicks} ticks)`;
      this.renderDetailsPanel();

      const subscription = this.api.openCombatReplay(
        start.replayId,
        {
          onOpen: () => {
            this.setStatus(`Replay conectado (${start.replayId.slice(0, 8)}).`);
          },
          onEvent: (event) => {
            if (event.type === "frame") {
              if (
                event.payload.tick % 5 === 0 ||
                event.payload.attackerHp === 0 ||
                event.payload.defenderHp === 0
              ) {
                this.combatReplaySummary =
                  `tick ${event.payload.tick}: atkHP=${event.payload.attackerHp} defHP=${event.payload.defenderHp}`;
                this.renderDetailsPanel();
              }
              return;
            }

            if (event.type === "result") {
              const loot = event.payload.loot;
              this.combatReplaySummary =
                `resultado=${event.payload.winner} ticks=${event.payload.durationTicks} loot[r1=${loot.r1},r2=${loot.r2},r3=${loot.r3},r4=${loot.r4}]`;
              this.setStatus(`Replay finalizado: vencedor=${event.payload.winner}.`);
              this.renderDetailsPanel();
              this.stopCombatReplayStream();
            }
          },
          onError: (error) => {
            this.combatReplaySummary = `falha replay: ${error.message}`;
            this.setStatus(`Falha no replay: ${error.message}`);
            this.renderDetailsPanel();
            this.stopCombatReplayStream();
          },
        },
        { speed: "fast" }
      );

      this.combatReplaySubscription = subscription;
      void subscription.closed.then(() => {
        if (this.combatReplaySubscription === subscription) {
          this.combatReplaySubscription = null;
        }
      });
    } catch (error) {
      this.combatReplaySummary = `falha replay: ${String((error as Error)?.message ?? error)}`;
      this.setStatus(`Falha ao iniciar replay: ${String((error as Error)?.message ?? error)}`);
      this.renderDetailsPanel();
    }
  }

  private stopCombatReplayStream(): void {
    this.combatReplaySubscription?.close();
    this.combatReplaySubscription = null;
  }

  private async saveBookmarkFromSelection(): Promise<void> {
    if (this.loading) return;

    const coord = this.selectedCoord;
    if (!coord) {
      this.setStatus("Selecione uma célula antes de salvar bookmark.");
      return;
    }

    const selected = this.getSelectedCell();
    const nameInput = this.bookmarkNameInput?.value.trim() ?? "";
    const bookmark: WorldmapBookmark = {
      id: selected?.bid ? `bid-${selected.bid}` : `xy-${coord.x}-${coord.y}`,
      name: nameInput.length > 0 ? nameInput : `Bookmark ${coord.x},${coord.y}`,
      x: coord.x,
      y: coord.y,
      ...(selected?.bid ? { bid: selected.bid } : {}),
      createdAt: new Date().toISOString(),
    };

    const nextBookmarks = upsertBookmark(this.bookmarks, bookmark);
    await this.persistBookmarks(nextBookmarks, `Bookmark salvo em (${coord.x}, ${coord.y}).`);

    if (this.bookmarkNameInput) {
      this.bookmarkNameInput.value = "";
    }
  }

  private async removeBookmark(bookmarkId: string): Promise<void> {
    const nextBookmarks = this.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
    if (nextBookmarks.length === this.bookmarks.length) return;

    await this.persistBookmarks(nextBookmarks, "Bookmark removido.");
  }

  private async gotoBookmark(bookmarkId: string): Promise<void> {
    const bookmark = this.bookmarks.find((item) => item.id === bookmarkId);
    if (!bookmark) return;

    this.selectedCoord = { x: bookmark.x, y: bookmark.y };
    this.viewport = centeredViewport(bookmark.x, bookmark.y, this.viewport.width, this.viewport.height);
    await this.refreshCellsOnly();
  }

  private async persistBookmarks(nextBookmarks: WorldmapBookmark[], successMessage: string): Promise<void> {
    if (this.loading) return;

    if (nextBookmarks.length > MAX_BOOKMARKS) {
      this.setStatus(`Limite de bookmarks excedido (${MAX_BOOKMARKS}).`);
      return;
    }

    this.loading = true;
    this.setStatus("Salvando bookmarks...");

    try {
      const response = await this.api.saveMaproomBookmarks({ bookmarks: nextBookmarks });
      if (!isLegacyOk(response.error)) {
        throw new Error(`savebookmarks retornou erro=${String(response.error)}`);
      }

      this.bookmarks = nextBookmarks;
      this.renderBookmarksPanel();
      this.setStatus(successMessage);
    } catch (error) {
      this.setStatus(`Falha ao salvar bookmarks: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
    }
  }

  private setStatus(message: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
  }
}

function centeredViewport(cx: number, cy: number, width: number, height: number): Viewport {
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);
  return normalizedViewport({
    x: cx - halfW,
    y: cy - halfH,
    width,
    height,
  });
}

function normalizedViewport(input: Viewport): Viewport {
  const width = clampInt(input.width, 1, 50);
  const height = clampInt(input.height, 1, 50);
  const maxX = MAPROOM_MAX_COORD - width + 1;
  const maxY = MAPROOM_MAX_COORD - height + 1;

  return {
    x: clampInt(input.x, 0, maxX),
    y: clampInt(input.y, 0, maxY),
    width,
    height,
  };
}

function clampInt(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? Math.trunc(value) : min;
  return Math.min(max, Math.max(min, n));
}

function fallbackHomeCell(): WorldmapV3Cell {
  return {
    n: "Unknown",
    uid: 0,
    bid: "0",
    tid: 0,
    x: 0,
    y: 0,
    aid: 0,
    l: 1,
    pl: 0,
    r: {},
    dm: 0,
    rel: 0,
    lo: 0,
    fr: 0,
    p: 0,
    d: 0,
    t: 0,
    fbid: "",
    b: 0,
    i: 0,
    m: {},
  };
}

function parseCoord(raw: string): { x: number; y: number } | null {
  const [xRaw, yRaw] = raw.split(":");
  return parseMaproomJumpInput(xRaw, yRaw, MAPROOM_MAX_COORD);
}

function parseIntRaw(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseIntRaw(value);
  if (parsed === null || parsed <= 0) return undefined;
  return parsed;
}

function toMonsterList(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const entries = Object.values(value);
  if (entries.length === 0) {
    return [];
  }

  const allObjects = entries.every((entry) => isRecord(entry));
  return allObjects ? entries : null;
}

function upsertBookmark(current: WorldmapBookmark[], nextBookmark: WorldmapBookmark): WorldmapBookmark[] {
  const key = bookmarkKey(nextBookmark);
  const filtered = current.filter((bookmark) => bookmarkKey(bookmark) !== key);
  return [nextBookmark, ...filtered].slice(0, MAX_BOOKMARKS);
}

function bookmarkKey(bookmark: WorldmapBookmark): string {
  if (bookmark.bid) {
    return `bid:${bookmark.bid}`;
  }
  return `xy:${bookmark.x}:${bookmark.y}`;
}

function normalizeBookmarksFromServer(raw: unknown): WorldmapBookmark[] {
  const entries: WorldmapBookmark[] = [];

  if (Array.isArray(raw)) {
    raw.forEach((value, index) => {
      const parsed = normalizeBookmarkCandidate(value, index);
      if (parsed) entries.push(parsed);
    });
  } else if (isRecord(raw)) {
    Object.entries(raw).forEach(([key, value], index) => {
      if (Array.isArray(value)) {
        value.forEach((entry, offset) => {
          const parsed = normalizeBookmarkCandidate(entry, index + offset, key);
          if (parsed) entries.push(parsed);
        });
        return;
      }

      const parsed = normalizeBookmarkCandidate(value, index, key);
      if (parsed) entries.push(parsed);
    });
  }

  const dedupedById = new Map<string, WorldmapBookmark>();
  entries.forEach((bookmark) => {
    dedupedById.set(bookmark.id, bookmark);
  });

  return [...dedupedById.values()].slice(0, MAX_BOOKMARKS);
}

function normalizeBookmarkCandidate(
  value: unknown,
  index: number,
  fallbackName?: string
): WorldmapBookmark | null {
  if (!isRecord(value)) return null;

  const x = parseIntRaw(value.x ?? value.X ?? value.cx ?? value.col);
  const y = parseIntRaw(value.y ?? value.Y ?? value.cy ?? value.row);
  if (
    x === null ||
    y === null ||
    x < 0 ||
    x > MAPROOM_MAX_COORD ||
    y < 0 ||
    y > MAPROOM_MAX_COORD
  ) {
    return null;
  }

  const bid = pickString(value.bid, value.baseid, value.baseId);
  const name = pickString(value.name, value.n, value.title, value.label, fallbackName) ?? `Bookmark ${x},${y}`;
  const id = pickString(value.id) ?? (bid ? `bid-${bid}` : `xy-${x}-${y}-${index}`);

  return {
    id,
    name,
    x,
    y,
    ...(bid ? { bid } : {}),
    ...(pickString(value.worldId, value.worldid)
      ? { worldId: pickString(value.worldId, value.worldid) as string }
      : {}),
    ...(pickString(value.createdAt) ? { createdAt: pickString(value.createdAt) as string } : {}),
  };
}

function summarizeResourceBag(value: unknown): string {
  if (!isRecord(value)) return "n/a";

  const keys = ["r1", "r2", "r3", "r4"];
  const parts: string[] = [];
  keys.forEach((key) => {
    const parsed = parseIntRaw(value[key]);
    if (parsed !== null) {
      parts.push(`${key}=${parsed}`);
    }
  });

  return parts.length > 0 ? parts.join(" ") : "n/a";
}

function compareCellsForVisiblePanel(a: WorldmapV3Cell, b: WorldmapV3Cell, currentUserId: number | null): number {
  const roleA = classifyMaproomCell(a, currentUserId);
  const roleB = classifyMaproomCell(b, currentUserId);

  const rank = (role: MaproomCellRole): number => {
    if (role === "mine") return 0;
    if (role === "enemy") return 1;
    return 2;
  };

  if (rank(roleA) !== rank(roleB)) {
    return rank(roleA) - rank(roleB);
  }

  if (a.l !== b.l) {
    return b.l - a.l;
  }

  if (a.y !== b.y) return a.y - b.y;
  return a.x - b.x;
}

export function classifyMaproomCell(
  cell: Pick<WorldmapV3Cell, "uid"> | null | undefined,
  currentUserId: number | null
): MaproomCellRole {
  if (!cell || cell.uid <= 0) return "free";
  if (currentUserId !== null && cell.uid === currentUserId) return "mine";
  return "enemy";
}

export function matchesCellFilter(
  cell: WorldmapV3Cell | undefined,
  currentUserId: number | null,
  filter: MaproomCellFilterMode
): boolean {
  if (filter === "all") return true;

  const role = classifyMaproomCell(cell, currentUserId);
  if (filter === "mine") return role === "mine";
  if (filter === "enemy") return role === "enemy";
  if (filter === "free") return role === "free";

  if (!cell) return false;
  if (filter === "damaged") return cell.dm > 0 || cell.d > 0;
  if (filter === "protected") return cell.p > 0;

  return true;
}

export function parseMaproomJumpInput(
  xValue: unknown,
  yValue: unknown,
  maxCoord: number
): { x: number; y: number } | null {
  const x = parseIntRaw(xValue);
  const y = parseIntRaw(yValue);
  if (x === null || y === null) return null;
  if (x < 0 || y < 0 || x > maxCoord || y > maxCoord) return null;
  return { x, y };
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function buildReplayIdempotencyKey(targetBaseId: string): string {
  return `replay-${targetBaseId}-${Date.now()}-${Math.trunc(Math.random() * 1_000_000)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLegacyOk(errorValue: unknown): boolean {
  return (
    errorValue === undefined ||
    errorValue === null ||
    errorValue === 0 ||
    errorValue === "0"
  );
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char] ?? char)
  );
}
