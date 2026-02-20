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

  private async open(): Promise<void> {
    this.ensureDom();
    if (!this.wrapper) return;

    this.visible = true;
    this.wrapper.style.display = "block";
    await this.refreshAll();
  }

  private ensureDom(): void {
    if (this.wrapper) return;

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.right = "12px";
    wrapper.style.bottom = "12px";
    wrapper.style.width = "min(96vw, 620px)";
    wrapper.style.maxHeight = "78vh";
    wrapper.style.overflow = "auto";
    wrapper.style.zIndex = "9998";
    wrapper.style.background = "rgba(11, 18, 32, 0.97)";
    wrapper.style.border = "1px solid #2b4669";
    wrapper.style.borderRadius = "12px";
    wrapper.style.padding = "12px";
    wrapper.style.color = "#ffffff";
    wrapper.style.display = "none";

    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
        <strong style="font-size:14px;">Social: rankings + logs + mensagens</strong>
        <button data-social-close style="padding:6px 10px;background:#2d3d60;border:none;color:#fff;border-radius:6px;cursor:pointer;">Fechar (L)</button>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <button data-social-refresh style="padding:6px 10px;background:#4068cc;border:none;color:#fff;border-radius:6px;cursor:pointer;">Atualizar tudo</button>
        <button data-social-load-mail style="padding:6px 10px;background:#2d8cff;border:none;color:#fff;border-radius:6px;cursor:pointer;">Atualizar mensagens</button>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <select data-social-world style="padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;min-width:250px;"></select>
        <button data-social-load-lb style="padding:6px 10px;background:#1c8f66;border:none;color:#fff;border-radius:6px;cursor:pointer;">Recarregar leaderboard</button>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        <select data-social-filter style="padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;min-width:200px;">
          ${ATTACK_FILTERS.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}
        </select>
        <button data-social-load-logs style="padding:6px 10px;background:#8b3db0;border:none;color:#fff;border-radius:6px;cursor:pointer;">Recarregar logs</button>
      </div>

      <div data-social-status style="font-size:12px;color:#bdcae8;min-height:18px;margin-bottom:8px;"></div>

      <div style="font-size:12px;color:#9fb4d9;margin-bottom:4px;">Leaderboard</div>
      <div data-social-leaderboard style="margin-bottom:10px;"></div>

      <div style="font-size:12px;color:#9fb4d9;margin-bottom:4px;">Attack logs</div>
      <div data-social-attacklogs style="margin-bottom:10px;"></div>

      <div style="font-size:12px;color:#9fb4d9;margin-bottom:4px;">Threads</div>
      <div data-social-threads style="margin-bottom:10px;"></div>

      <div style="font-size:12px;color:#9fb4d9;margin-bottom:4px;">Mensagens da thread</div>
      <div data-social-thread-detail style="margin-bottom:10px;"></div>

      <div style="font-size:12px;color:#9fb4d9;margin-bottom:4px;">Enviar mensagem</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
        <input data-social-targetid type="number" min="1" placeholder="Target user id"
          style="padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;min-width:150px;" />
        <input data-social-subject placeholder="Assunto"
          style="padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;min-width:220px;flex:1;" />
      </div>
      <textarea data-social-message rows="3" placeholder="Mensagem..."
        style="width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid #2f3a55;background:#10172b;color:#fff;margin-bottom:6px;resize:vertical;"></textarea>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button data-social-send-message style="padding:6px 10px;background:#18925e;border:none;color:#fff;border-radius:6px;cursor:pointer;">Enviar</button>
        <button data-social-report-thread style="padding:6px 10px;background:#a34747;border:none;color:#fff;border-radius:6px;cursor:pointer;">Reportar/Bloquear thread selecionada</button>
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
        `<div style="font-size:12px;color:#c4cee6;border:1px solid #2f3a55;border-radius:8px;padding:8px;">Sem dados de leaderboard para o mundo selecionado.</div>`;
      return;
    }

    const rows = this.leaderboard
      .map((entry, index) => {
        const discord = entry.discord_tag ? ` • ${entry.discord_tag}` : "";
        return `
          <tr>
            <td style="padding:4px 6px;border-bottom:1px solid #2f3a55;color:#c2d6ff;">${index + 1}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #2f3a55;color:#ffffff;">${escapeHtml(entry.username)}${escapeHtml(discord)}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #2f3a55;color:#9ad8a9;text-align:right;">${entry.outpost_count}</td>
          </tr>
        `;
      })
      .join("");

    this.leaderboardEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #2f3a55;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#1a2944;color:#d8e4ff;">
            <th style="padding:6px;text-align:left;">#</th>
            <th style="padding:6px;text-align:left;">Jogador</th>
            <th style="padding:6px;text-align:right;">Outposts</th>
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
        `<div style="font-size:12px;color:#c4cee6;border:1px solid #2f3a55;border-radius:8px;padding:8px;">Nenhum attack log para o filtro atual.</div>`;
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
          <div style="border:1px solid #2f3a55;border-radius:8px;padding:8px;background:#131c30;margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;">
              <strong style="color:#dbe6ff;">${escapeHtml(headline)}</strong>
              <span style="color:#93a7cd;">${escapeHtml(time)}</span>
            </div>
            <div style="margin-top:4px;font-size:12px;color:#bdcae8;">
              tipo=${escapeHtml(entry.type)}${escapeHtml(coords)}
            </div>
            <div style="margin-top:4px;font-size:12px;color:#99d8a8;">
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
      this.threadsEl.innerHTML =
        `<div style="font-size:12px;color:#c4cee6;border:1px solid #2f3a55;border-radius:8px;padding:8px;">Nenhuma thread disponível.</div>`;
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
            style="display:block;width:100%;text-align:left;border:1px solid ${selected ? "#4a74d1" : "#2f3a55"};background:${selected ? "#1f2f50" : "#131c30"};color:#fff;border-radius:8px;padding:8px;margin-bottom:6px;cursor:pointer;">
            <div style="font-size:12px;color:#dbe6ff;"><strong>#${thread.threadId}</strong> com ${escapeHtml(targetName)} (${thread.peerUserId})${escapeHtml(unread)}</div>
            <div style="font-size:12px;color:#a9b9dd;margin-top:2px;">${escapeHtml(thread.subject)}</div>
            <div style="font-size:12px;color:#8ea2cb;margin-top:2px;">${escapeHtml(thread.preview || "(sem texto)")}</div>
            <div style="font-size:11px;color:#7f92b8;margin-top:2px;">${escapeHtml(stamp)}</div>
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
        `<div style="font-size:12px;color:#c4cee6;border:1px solid #2f3a55;border-radius:8px;padding:8px;">Selecione uma thread para ver mensagens.</div>`;
      return;
    }

    if (this.threadMessages.length === 0) {
      this.threadDetailEl.innerHTML =
        `<div style="font-size:12px;color:#c4cee6;border:1px solid #2f3a55;border-radius:8px;padding:8px;">Thread ${this.selectedThreadId} sem mensagens.</div>`;
      return;
    }

    const rows = this.threadMessages
      .map((message) => {
        const stamp = formatAttackLogTime(message.updatetime ?? 0);
        return `
          <div style="border:1px solid #2f3a55;border-radius:8px;padding:8px;background:#131c30;margin-bottom:6px;">
            <div style="font-size:12px;color:#d7e2ff;"><strong>${escapeHtml(message.subject ?? "(sem assunto)")}</strong></div>
            <div style="font-size:12px;color:#b7c8eb;margin-top:2px;">from=${message.userid} to=${message.targetid ?? "?"} type=${escapeHtml(message.messagetype)}</div>
            <div style="font-size:12px;color:#dce7ff;margin-top:4px;white-space:pre-wrap;">${escapeHtml(message.message ?? "")}</div>
            <div style="font-size:11px;color:#8398bf;margin-top:4px;">${escapeHtml(stamp)}</div>
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
