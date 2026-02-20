import { Container, Text } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ClientConfig } from "../../lib/config";
import { parseBaseLoadResponse } from "../../lib/base/baseLoad";
import { stateSnapshotToParsedBaseLoad } from "../../lib/base/stateSnapshot";
import type { TokenStore } from "../../lib/auth/tokenStore";
import { LoginScene } from "./LoginScene";
import { YardScene } from "./YardScene";

export class BootScene {
  constructor(
    private readonly deps: {
      api: ApiClient;
      tokenStore: TokenStore;
      root: Container;
      config: ClientConfig;
    }
  ) {}

  async run(): Promise<void> {
    const { root, api, tokenStore, config } = this.deps;

    const status = new Text({ text: "Init...", style: { fill: 0xffffff } as any });
    status.position.set(12, 40);
    root.addChild(status);

    const init = await api.init();
    if (init.versionMismatch) {
      status.text = "Client version mismatch.";
      this.renderUpdateRequired(init.error, init.downloadUrl);
      return;
    }

    const canonicalStateRequired = Boolean(init.protocol?.canonicalStateRequired);

    const login = new LoginScene({
      tokenStore,
      api,
      allowSkip: config.debug,
    });
    await login.run();

    status.text = "Fetching maproom metadata...";

    try {
      const mr = await api.getNewMap();
      status.text = `Maproom: ${mr.newmap ? "v3" : "legacy"}`;
    } catch {
      status.text = "Maproom metadata unavailable (missing/invalid token).";
    }

    status.text = "Loading base...";

    let parsed = parseBaseLoadResponse({});
    try {
      status.text = "Loading canonical state snapshot...";
      const snapshot = await api.stateSnapshot({ scope: "main" });
      parsed = stateSnapshotToParsedBaseLoad(snapshot);
      status.text = "State snapshot loaded.";
    } catch (err) {
      if (canonicalStateRequired) {
        status.text = "Canonical state required and /state failed.";
        this.renderProtocolRequired(
          "Este ambiente exige o protocolo canônico de estado (/state + /stream).",
          String((err as Error)?.message ?? err),
          init.downloadUrl
        );
        return;
      }

      status.text = "State snapshot unavailable; trying /base/load...";
      try {
        const raw = await api.baseLoad("home", "view");
        parsed = parseBaseLoadResponse(raw);
        status.text = "Base loaded.";
      } catch {
        status.text = "Base load failed; rendering default yard.";
      }
    }

    const yard = new YardScene({ root, base: parsed, cdnUrl: config.cdnUrl, api });
    await yard.run();
  }

  private renderUpdateRequired(reason?: string, downloadUrl?: string): void {
    this.renderBlockingOverlay({
      title: "Update required",
      message: "Seu cliente está desatualizado para este ambiente. Atualize para continuar.",
      reason,
      downloadUrl,
    });
  }

  private renderProtocolRequired(summary: string, reason?: string, downloadUrl?: string): void {
    this.renderBlockingOverlay({
      title: "Protocol update required",
      message: summary,
      reason,
      downloadUrl,
    });
  }

  private renderBlockingOverlay(opts: {
    title: string;
    message: string;
    reason?: string;
    downloadUrl?: string;
  }): void {
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.inset = "0";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.background = "rgba(7, 10, 18, 0.9)";
    wrapper.style.zIndex = "9999";

    wrapper.innerHTML = `
      <div style="max-width:520px;background:#11182b;border:1px solid #2f3a55;border-radius:12px;padding:20px;color:#fff;box-shadow:0 20px 40px rgba(0,0,0,0.4)">
        <h2 style="margin:0 0 10px 0;font-size:20px">${escapeHtml(opts.title)}</h2>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5">${escapeHtml(opts.message)}</p>
        ${opts.reason ? `<p style="margin:0 0 14px 0;font-size:12px;color:#b9c3dd">Detalhes: ${escapeHtml(opts.reason)}</p>` : ""}
        ${
          opts.downloadUrl
            ? `<a id="bymr-download" href="${escapeHtml(opts.downloadUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px 0 0;padding:10px 14px;background:#18a058;color:#fff;border-radius:8px;text-decoration:none">Baixar cliente</a>`
            : ""
        }
        <button id="bymr-reload" style="padding:10px 14px;background:#4a68ff;color:#fff;border:none;border-radius:8px;cursor:pointer">Recarregar</button>
      </div>
    `;

    wrapper.querySelector<HTMLButtonElement>("#bymr-reload")?.addEventListener("click", () => {
      window.location.reload();
    });

    document.body.appendChild(wrapper);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}
