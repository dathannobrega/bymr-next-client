import type { ApiClient } from "../../lib/api/client";
import type { TokenStore } from "../../lib/auth/tokenStore";

export class LoginScene {
  constructor(
    private readonly deps: {
      tokenStore: TokenStore;
      api: ApiClient;
      allowSkip: boolean;
    }
  ) {}

  async run(): Promise<void> {
    const existing = await this.deps.tokenStore.get();
    if (existing) return;

    await new Promise<void>((resolve) => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "16px";
      wrapper.style.right = "16px";
      wrapper.style.background = "rgba(13, 18, 30, 0.95)";
      wrapper.style.border = "1px solid #2f3a55";
      wrapper.style.padding = "12px";
      wrapper.style.zIndex = "9999";
      wrapper.style.width = "320px";
      wrapper.style.color = "#fff";
      wrapper.innerHTML = `
        <h3 style="margin:0 0 8px 0;font-size:14px">Login</h3>
        <p style="margin:0 0 8px 0;font-size:12px;line-height:1.4">Entre com email/senha (ou token manual para dev).</p>
        <input id="bymr-email-input" type="email" placeholder="email"
          style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#0f1422;color:#fff;border:1px solid #3a4666" />
        <input id="bymr-password-input" type="password" placeholder="password"
          style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#0f1422;color:#fff;border:1px solid #3a4666" />
        <button id="bymr-login-submit" style="width:100%;padding:8px;background:#3dbe7a;color:#fff;border:none;cursor:pointer;margin-bottom:8px">Entrar com email/senha</button>
        <div style="margin:0 0 8px 0;font-size:11px;color:#9bb1de">ou token manual</div>
        <input id="bymr-token-input" type="password" placeholder="Bearer token"
          style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#0f1422;color:#fff;border:1px solid #3a4666" />
        <button id="bymr-token-save" style="width:100%;padding:8px;background:#4a68ff;color:#fff;border:none;cursor:pointer">Salvar token e continuar</button>
        <button id="bymr-token-skip" style="display:${this.deps.allowSkip ? "block" : "none"};width:100%;padding:8px;margin-top:8px;background:#25314d;color:#fff;border:none;cursor:pointer">Continuar sem token (dev)</button>
        <div id="bymr-login-error" style="margin-top:8px;font-size:12px;color:#ffb4b4;min-height:16px"></div>
      `;

      const cleanup = () => {
        wrapper.remove();
        resolve();
      };

      const errorEl = wrapper.querySelector<HTMLDivElement>("#bymr-login-error");
      const setError = (message: string) => {
        if (errorEl) errorEl.textContent = message;
      };

      wrapper.querySelector<HTMLButtonElement>("#bymr-login-submit")?.addEventListener("click", async () => {
        const email = wrapper.querySelector<HTMLInputElement>("#bymr-email-input")?.value.trim() ?? "";
        const password = wrapper.querySelector<HTMLInputElement>("#bymr-password-input")?.value ?? "";

        if (!email || !password) {
          setError("Informe email e senha.");
          return;
        }

        try {
          setError("");
          const result = await this.deps.api.login({ email, password });
          await this.deps.tokenStore.set(result.token);
          cleanup();
        } catch (error) {
          setError(String((error as Error)?.message ?? error));
        }
      });

      wrapper.querySelector<HTMLButtonElement>("#bymr-token-save")?.addEventListener("click", async () => {
        const input = wrapper.querySelector<HTMLInputElement>("#bymr-token-input");
        const token = input?.value.trim() || null;
        if (token) {
          await this.deps.tokenStore.set(token);
        }
        cleanup();
      });

      wrapper.querySelector<HTMLButtonElement>("#bymr-token-skip")?.addEventListener("click", () => {
        if (!this.deps.allowSkip) {
          setError("Login obrigatório neste ambiente.");
          return;
        }
        cleanup();
      });

      document.body.appendChild(wrapper);
    });
  }
}
