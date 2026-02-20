import { Container, Text } from "pixi.js";
import type { ApiClient } from "../../lib/api/client";
import type { ClientConfig } from "../../lib/config";
import { parseBaseLoadResponse } from "../../lib/base/baseLoad";
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
      const raw = await api.baseLoad("home", "view");
      parsed = parseBaseLoadResponse(raw);
      status.text = "Base loaded.";
    } catch {
      status.text = "Base load failed; rendering default yard.";
    }

    const yard = new YardScene({ root, base: parsed, cdnUrl: config.cdnUrl, api });
    await yard.run();
  }

  private renderUpdateRequired(reason?: string, downloadUrl?: string): void {
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
        <h2 style="margin:0 0 10px 0;font-size:20px">Update required</h2>
        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.5">Seu cliente está desatualizado para este ambiente. Atualize para continuar.</p>
        ${reason ? `<p style="margin:0 0 14px 0;font-size:12px;color:#b9c3dd">Detalhes: ${escapeHtml(reason)}</p>` : ""}
        ${
          downloadUrl
            ? `<a id="bymr-download" href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px 0 0;padding:10px 14px;background:#18a058;color:#fff;border-radius:8px;text-decoration:none">Baixar cliente</a>`
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
