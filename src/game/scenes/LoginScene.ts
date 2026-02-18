import type { TokenStore } from "../../lib/auth/tokenStore";

export class LoginScene {
  constructor(private readonly deps: { tokenStore: TokenStore }) {}

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
        <h3 style="margin:0 0 8px 0;font-size:14px">Dev Login</h3>
        <p style="margin:0 0 8px 0;font-size:12px;line-height:1.4">Insira manualmente um Bearer token para chamadas autenticadas.</p>
        <input id="bymr-token-input" type="password" placeholder="Bearer token"
          style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#0f1422;color:#fff;border:1px solid #3a4666" />
        <button id="bymr-token-save" style="width:100%;padding:8px;background:#4a68ff;color:#fff;border:none;cursor:pointer">Salvar token e continuar</button>
        <button id="bymr-token-skip" style="width:100%;padding:8px;margin-top:8px;background:#25314d;color:#fff;border:none;cursor:pointer">Continuar sem token</button>
      `;

      const cleanup = () => {
        wrapper.remove();
        resolve();
      };

      wrapper.querySelector<HTMLButtonElement>("#bymr-token-save")?.addEventListener("click", async () => {
        const input = wrapper.querySelector<HTMLInputElement>("#bymr-token-input");
        const token = input?.value.trim() || null;
        if (token) {
          await this.deps.tokenStore.set(token);
        }
        cleanup();
      });

      wrapper.querySelector<HTMLButtonElement>("#bymr-token-skip")?.addEventListener("click", cleanup);

      document.body.appendChild(wrapper);
    });
  }
}
