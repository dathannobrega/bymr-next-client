import type { ApiClient } from "../../lib/api/client";
import type { MessagePayload, MessageTarget } from "../../lib/contracts/mail";
import type {
  AttackLogFilter,
  SocialAttackLogEntry,
  SocialLeaderboardEntry,
  SocialWorld,
} from "../../lib/contracts/social";

const ATTACK_FILTERS: Array<{ value: AttackLogFilter; label: string }> = [
  { value: "both", label: "Todos os logs" },
  { value: "myattacks", label: "Meus ataques" },
  { value: "peopleattackingme", label: "Defesas" },
];

const MAX_LEADERBOARD_ROWS = 25;
const MAX_ATTACK_LOG_ROWS = 40;
const MAX_THREAD_MESSAGE_ROWS = 80;

type ThreadSummary = {
  threadId: number;
  peerUserId: number;
  subject: string;
  preview: string;
  updatedAt: number;
  unread: number;
};

export class SocialOverlay {
  private wrapper: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;
  private worldsSelectEl: HTMLSelectElement | null = null;
  private filterSelectEl: HTMLSelectElement | null = null;
  private leaderboardEl: HTMLDivElement | null = null;
  private attackLogsEl: HTMLDivElement | null = null;
  private threadsEl: HTMLDivElement | null = null;
  private threadDetailEl: HTMLDivElement | null = null;
  private targetInputEl: HTMLInputElement | null = null;
  private subjectInputEl: HTMLInputElement | null = null;
  private messageInputEl: HTMLTextAreaElement | null = null;

  private visible = false;
  private loading = false;
  private worlds: SocialWorld[] = [];
  private selectedWorldId = "";
  private leaderboard: SocialLeaderboardEntry[] = [];
  private attackLogs: SocialAttackLogEntry[] = [];
  private attackFilter: AttackLogFilter = "both";
  private targets: Record<string, MessageTarget> = {};
  private threads: ThreadSummary[] = [];
  private selectedThreadId: number | null = null;
  private threadMessages: MessagePayload[] = [];
  private sendingMessage = false;

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
    wrapper.className = "legacy-window legacy-window-social";
    wrapper.dataset.legacyTheme = "active";
    wrapper.dataset.legacyFrame = "frame3";
    wrapper.style.display = "none";

    wrapper.innerHTML = `
      <div class="legacy-window-header">
        <strong class="legacy-window-title">Social: rankings + logs + mensagens</strong>
        <button data-social-close class="legacy-btn legacy-btn-ghost">Fechar (L)</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <button data-social-refresh class="legacy-btn legacy-btn-primary">Atualizar tudo</button>
        <button data-social-load-mail class="legacy-btn legacy-btn-primary">Atualizar mensagens</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <select data-social-world class="legacy-input legacy-social-world-select"></select>
        <button data-social-load-lb class="legacy-btn legacy-btn-positive">Recarregar leaderboard</button>
      </div>

      <div class="legacy-form-row legacy-form-row-wrap">
        <select data-social-filter class="legacy-input legacy-social-filter-select">
          ${ATTACK_FILTERS.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
        </select>
        <button data-social-load-logs class="legacy-btn legacy-btn-primary">Recarregar logs</button>
      </div>

      <div data-social-status class="legacy-muted-text legacy-social-status"></div>

      <div class="legacy-window-section-title">Leaderboard</div>
      <div data-social-leaderboard class="legacy-window-section"></div>

      <div class="legacy-window-section-title">Attack logs</div>
      <div data-social-attacklogs class="legacy-window-section"></div>

      <div class="legacy-window-section-title">Threads</div>
      <div data-social-threads class="legacy-window-section"></div>

      <div class="legacy-window-section-title">Mensagens da thread</div>
      <div data-social-thread-detail class="legacy-window-section"></div>

      <div class="legacy-window-section-title">Enviar mensagem</div>
      <div class="legacy-form-row legacy-form-row-wrap">
        <input data-social-targetid type="number" min="1" placeholder="Target user id" class="legacy-input legacy-social-target-input" />
        <input data-social-subject placeholder="Assunto" class="legacy-input legacy-social-subject-input" />
      </div>
      <textarea data-social-message rows="3" placeholder="Mensagem..." class="legacy-input legacy-input-wide legacy-social-message-input"></textarea>
      <div class="legacy-form-row legacy-form-row-wrap">
        <button data-social-send-message class="legacy-btn legacy-btn-positive">Enviar</button>
        <button data-social-report-thread class="legacy-btn legacy-btn-danger">Reportar/Bloquear thread selecionada</button>
      </div>
    `;

    wrapper.querySelector<HTMLButtonElement>("[data-social-close]")?.addEventListener("click", () => {
      this.close();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-refresh]")?.addEventListener("click", () => {
      void this.refreshAll();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-load-mail]")?.addEventListener("click", () => {
      void this.refreshMailbox();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-load-lb]")?.addEventListener("click", () => {
      void this.refreshLeaderboards();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-load-logs]")?.addEventListener("click", () => {
      void this.refreshAttackLogs();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-send-message]")?.addEventListener("click", () => {
      void this.sendMessageFromComposer();
    });

    wrapper.querySelector<HTMLButtonElement>("[data-social-report-thread]")?.addEventListener("click", () => {
      void this.reportSelectedThread();
    });

    this.worldsSelectEl = wrapper.querySelector<HTMLSelectElement>("[data-social-world]");
    this.filterSelectEl = wrapper.querySelector<HTMLSelectElement>("[data-social-filter]");
    this.statusEl = wrapper.querySelector<HTMLDivElement>("[data-social-status]");
    this.leaderboardEl = wrapper.querySelector<HTMLDivElement>("[data-social-leaderboard]");
    this.attackLogsEl = wrapper.querySelector<HTMLDivElement>("[data-social-attacklogs]");
    this.threadsEl = wrapper.querySelector<HTMLDivElement>("[data-social-threads]");
    this.threadDetailEl = wrapper.querySelector<HTMLDivElement>("[data-social-thread-detail]");
    this.targetInputEl = wrapper.querySelector<HTMLInputElement>("[data-social-targetid]");
    this.subjectInputEl = wrapper.querySelector<HTMLInputElement>("[data-social-subject]");
    this.messageInputEl = wrapper.querySelector<HTMLTextAreaElement>("[data-social-message]");

    this.worldsSelectEl?.addEventListener("change", () => {
      const nextWorld = this.worldsSelectEl?.value.trim() ?? "";
      this.selectedWorldId = nextWorld;
      void this.refreshLeaderboards();
    });

    this.filterSelectEl?.addEventListener("change", () => {
      const nextFilter = this.filterSelectEl?.value as AttackLogFilter | undefined;
      if (!nextFilter) return;
      this.attackFilter = nextFilter;
      void this.refreshAttackLogs();
    });

    this.wrapper = wrapper;
    document.body.appendChild(wrapper);

    this.renderWorldSelect();
    this.renderLeaderboards();
    this.renderAttackLogs();
    this.renderThreads();
    this.renderThreadDetails();
  }

  private async refreshAll(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.setStatus("Carregando social...");

    try {
      await this.refreshWorlds();
      await Promise.all([this.refreshLeaderboards(), this.refreshAttackLogs(), this.refreshMailbox()]);
      this.setStatus("Social sincronizado.");
    } catch (error) {
      this.setStatus(`Falha ao atualizar social: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.loading = false;
    }
  }

  private async refreshWorlds(): Promise<void> {
    const response = await this.api.getAvailableWorlds();
    this.worlds = response.worlds;
    if (!this.worlds.some((world) => world.uuid === this.selectedWorldId)) {
      this.selectedWorldId = this.worlds[0]?.uuid ?? "";
    }
    this.renderWorldSelect();
  }

  private async refreshLeaderboards(): Promise<void> {
    if (!this.selectedWorldId) {
      this.leaderboard = [];
      this.renderLeaderboards();
      this.setStatus("Nenhum mundo disponível para leaderboard.");
      return;
    }

    try {
      const response = await this.api.getLeaderboards(this.selectedWorldId);
      this.leaderboard = response.leaderboard.slice(0, MAX_LEADERBOARD_ROWS);
      this.renderLeaderboards();
      this.setStatus(`Leaderboard carregada (${this.leaderboard.length} entrada(s)).`);
    } catch (error) {
      this.setStatus(`Falha ao carregar leaderboard: ${String((error as Error)?.message ?? error)}`);
    }
  }

  private async refreshAttackLogs(): Promise<void> {
    try {
      const response = await this.api.getAttackLogs(this.attackFilter);
      this.attackLogs = response.attackLogs.slice(0, MAX_ATTACK_LOG_ROWS);
      this.renderAttackLogs();
      this.setStatus(`Attack logs carregados (${this.attackLogs.length} entrada(s)).`);
    } catch (error) {
      this.setStatus(`Falha ao carregar attack logs: ${String((error as Error)?.message ?? error)}`);
    }
  }

  private async refreshMailbox(): Promise<void> {
    try {
      const [targetsResponse, threadsResponse] = await Promise.all([
        this.api.getMessageTargets(),
        this.api.getMessageThreads(),
      ]);

      this.targets = targetsResponse.targets;
      this.threads = toThreadSummaries(threadsResponse.threads);

      if (this.threads.length === 0) {
        this.selectedThreadId = null;
        this.threadMessages = [];
      } else if (!this.selectedThreadId || !this.threads.some((thread) => thread.threadId === this.selectedThreadId)) {
        this.selectedThreadId = this.threads[0]?.threadId ?? null;
      }

      this.renderThreads();

      if (this.selectedThreadId) {
        await this.loadThread(this.selectedThreadId, { silentStatus: true });
      } else {
        this.renderThreadDetails();
      }

      this.syncComposeTargetFromSelection();
      this.setStatus(`Mensageria carregada (${this.threads.length} thread(s)).`);
    } catch (error) {
      this.setStatus(`Falha ao carregar mensageria: ${String((error as Error)?.message ?? error)}`);
    }
  }

  private async loadThread(threadId: number, opts?: { silentStatus?: boolean }): Promise<void> {
    try {
      const response = await this.api.getMessageThread({ threadId });
      this.selectedThreadId = threadId;
      this.threadMessages = toMessageList(response.thread).slice(0, MAX_THREAD_MESSAGE_ROWS);
      this.renderThreads();
      this.renderThreadDetails();
      this.syncComposeTargetFromSelection();

      if (!opts?.silentStatus) {
        this.setStatus(`Thread ${threadId} carregada (${this.threadMessages.length} mensagem(ns)).`);
      }
    } catch (error) {
      this.setStatus(`Falha ao carregar thread ${threadId}: ${String((error as Error)?.message ?? error)}`);
    }
  }

  private async sendMessageFromComposer(): Promise<void> {
    if (this.sendingMessage) return;

    const subject = this.subjectInputEl?.value.trim() ?? "";
    const message = this.messageInputEl?.value.trim() ?? "";
    if (!subject || !message) {
      this.setStatus("Assunto e mensagem são obrigatórios.");
      return;
    }

    const selectedThread = this.threads.find((thread) => thread.threadId === this.selectedThreadId) ?? null;
    const explicitTarget = parsePositiveInt(this.targetInputEl?.value);
    const targetUserId = selectedThread?.peerUserId ?? explicitTarget;
    if (!targetUserId) {
      this.setStatus("Defina um target user id válido.");
      return;
    }

    const threadId = selectedThread?.threadId ?? 0;

    try {
      this.sendingMessage = true;
      const response = await this.api.sendMessage({
        threadId,
        targetUserId,
        subject,
        message,
        type: "message",
        targetBaseId: "0",
      });

      if (!isActionOk(response.error)) {
        throw new Error(`sendmessage retornou error=${String(response.error)}`);
      }

      this.messageInputEl!.value = "";

      const responseThreadId = parsePositiveInt(response.threadid);
      await this.refreshMailbox();

      if (responseThreadId) {
        await this.loadThread(responseThreadId, { silentStatus: true });
      }

      this.setStatus(`Mensagem enviada para user ${targetUserId}.`);
    } catch (error) {
      this.setStatus(`Falha ao enviar mensagem: ${String((error as Error)?.message ?? error)}`);
    } finally {
      this.sendingMessage = false;
    }
  }

  private async reportSelectedThread(): Promise<void> {
    if (!this.selectedThreadId) {
      this.setStatus("Selecione uma thread para reportar/bloquear.");
      return;
    }

    try {
      const response = await this.api.reportMessageThread({
        threadId: this.selectedThreadId,
        reason: "abuse",
      });
      if (!isActionOk(response.error)) {
        throw new Error(`reportmessagethread retornou error=${String(response.error)}`);
      }

      await this.refreshMailbox();
      this.setStatus(`Thread ${this.selectedThreadId} reportada/bloqueada.`);
    } catch (error) {
      this.setStatus(`Falha ao reportar thread: ${String((error as Error)?.message ?? error)}`);
    }
  }

  private syncComposeTargetFromSelection(): void {
    const selected = this.threads.find((thread) => thread.threadId === this.selectedThreadId);
    if (!selected || !this.targetInputEl) return;
    this.targetInputEl.value = String(selected.peerUserId);
  }

  private renderWorldSelect(): void {
    if (!this.worldsSelectEl) return;

    if (this.worlds.length === 0) {
      this.worldsSelectEl.innerHTML = `<option value="">Sem mundos</option>`;
      this.worldsSelectEl.disabled = true;
      return;
    }

    this.worldsSelectEl.disabled = false;
    this.worldsSelectEl.innerHTML = this.worlds
      .map((world) => {
        const selectedAttr = world.uuid === this.selectedWorldId ? " selected" : "";
        const label = `${world.name} (${world.playerCount} players)`;
        return `<option value="${escapeHtml(world.uuid)}"${selectedAttr}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  private renderLeaderboards(): void {
    if (!this.leaderboardEl) return;

    if (this.leaderboard.length === 0) {
      this.leaderboardEl.innerHTML =
        '<div class="legacy-empty-state">Sem dados de leaderboard para o mundo selecionado.</div>';
      return;
    }

    const rows = this.leaderboard
      .map((entry, index) => {
        const discord = entry.discord_tag ? ` • ${entry.discord_tag}` : "";
        return `
          <tr>
            <td class="legacy-social-rank-cell">${index + 1}</td>
            <td class="legacy-social-player-cell">${escapeHtml(entry.username)}${escapeHtml(discord)}</td>
            <td class="legacy-social-outpost-cell">${entry.outpost_count}</td>
          </tr>
        `;
      })
      .join("");

    this.leaderboardEl.innerHTML = `
      <table class="legacy-social-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jogador</th>
            <th class="legacy-align-right">Outposts</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private renderAttackLogs(): void {
    if (!this.attackLogsEl) return;

    if (this.attackLogs.length === 0) {
      this.attackLogsEl.innerHTML =
        '<div class="legacy-empty-state">Nenhum attack log para o filtro atual.</div>';
      return;
    }

    const rows = this.attackLogs
      .map((entry) => {
        const headline = `${entry.attacker_username} -> ${entry.defender_username}`;
        const coords =
          typeof entry.x === "number" && typeof entry.y === "number"
            ? ` @ (${entry.x}, ${entry.y})`
            : "";
        const loot = summarizeLoot(entry.loot);
        const time = formatAttackLogTime(entry.attacktime);

        return `
          <div class="legacy-social-log-card">
            <div class="legacy-social-log-head">
              <strong>${escapeHtml(headline)}</strong>
              <span>${escapeHtml(time)}</span>
            </div>
            <div class="legacy-social-log-type">
              tipo=${escapeHtml(entry.type)}${escapeHtml(coords)}
            </div>
            <div class="legacy-social-log-loot">
              loot=${escapeHtml(loot)}
            </div>
          </div>
        `;
      })
      .join("");

    this.attackLogsEl.innerHTML = rows;
  }

  private renderThreads(): void {
    if (!this.threadsEl) return;

    if (this.threads.length === 0) {
      this.threadsEl.innerHTML = '<div class="legacy-empty-state">Nenhuma thread disponível.</div>';
      return;
    }

    const rows = this.threads
      .map((thread) => {
        const selected = thread.threadId === this.selectedThreadId;
        const targetName = this.targets[String(thread.peerUserId)]?.first_name ?? `uid:${thread.peerUserId}`;
        const unread = thread.unread > 0 ? ` • unread=${thread.unread}` : "";
        const stamp = formatAttackLogTime(thread.updatedAt);
        return `
          <button data-social-thread-id="${thread.threadId}"
            class="legacy-social-thread-btn${selected ? " is-selected" : ""}">
            <div class="legacy-social-thread-head"><strong>#${thread.threadId}</strong> com ${escapeHtml(targetName)} (${thread.peerUserId})${escapeHtml(unread)}</div>
            <div class="legacy-social-thread-subject">${escapeHtml(thread.subject)}</div>
            <div class="legacy-social-thread-preview">${escapeHtml(thread.preview || "(sem texto)")}</div>
            <div class="legacy-social-thread-time">${escapeHtml(stamp)}</div>
          </button>
        `;
      })
      .join("");

    this.threadsEl.innerHTML = rows;
    this.threadsEl.querySelectorAll<HTMLButtonElement>("[data-social-thread-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const threadId = parsePositiveInt(button.dataset.socialThreadId);
        if (!threadId) return;
        void this.loadThread(threadId);
      });
    });
  }

  private renderThreadDetails(): void {
    if (!this.threadDetailEl) return;

    if (!this.selectedThreadId) {
      this.threadDetailEl.innerHTML =
        '<div class="legacy-empty-state">Selecione uma thread para ver mensagens.</div>';
      return;
    }

    if (this.threadMessages.length === 0) {
      this.threadDetailEl.innerHTML =
        `<div class="legacy-empty-state">Thread ${this.selectedThreadId} sem mensagens.</div>`;
      return;
    }

    const rows = this.threadMessages
      .map((message) => {
        const stamp = formatAttackLogTime(message.updatetime ?? 0);
        return `
          <div class="legacy-social-message-card">
            <div class="legacy-social-message-title"><strong>${escapeHtml(message.subject ?? "(sem assunto)")}</strong></div>
            <div class="legacy-social-message-meta">from=${message.userid} to=${message.targetid ?? "?"} type=${escapeHtml(message.messagetype)}</div>
            <div class="legacy-social-message-body">${escapeHtml(message.message ?? "")}</div>
            <div class="legacy-social-message-time">${escapeHtml(stamp)}</div>
          </div>
        `;
      })
      .join("");

    this.threadDetailEl.innerHTML = rows;
  }

  private setStatus(message: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = message;
  }
}

function toThreadSummaries(threads: Record<string, MessagePayload>): ThreadSummary[] {
  return Object.values(threads)
    .map((message) => ({
      threadId: message.threadid,
      peerUserId: message.userid,
      subject: (message.subject ?? "(sem assunto)").trim() || "(sem assunto)",
      preview: (message.message ?? "").trim().slice(0, 120),
      updatedAt: message.updatetime ?? 0,
      unread: message.unread ?? 0,
    }))
    .sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return b.threadId - a.threadId;
    });
}

function toMessageList(thread: Record<string, MessagePayload>): MessagePayload[] {
  return Object.values(thread).sort((a, b) => {
    const byTime = (a.updatetime ?? 0) - (b.updatetime ?? 0);
    if (byTime !== 0) return byTime;
    return a.threadid - b.threadid;
  });
}

function summarizeLoot(loot: unknown): string {
  if (!loot || typeof loot !== "object") {
    return "n/a";
  }

  const record = loot as Record<string, unknown>;
  const parts = ["r1", "r2", "r3", "r4"]
    .filter((key) => typeof record[key] === "number")
    .map((key) => `${key}:${String(record[key])}`);

  if (parts.length > 0) return parts.join(" ");
  return "n/a";
}

function formatAttackLogTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return value;
  }

  return "unknown";
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function isActionOk(error: string | number): boolean {
  return error === 0 || error === "0";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
