import { ClientHttpError } from "../api/httpError";

type GlobalErrorModalOptions = {
  title?: string;
  fatal?: boolean;
};

let listenersInstalled = false;
let modalRoot: HTMLDivElement | null = null;

export function installGlobalErrorModal(): void {
  if (listenersInstalled || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  listenersInstalled = true;

  window.addEventListener("error", (event) => {
    showGlobalError(event.error ?? event.message, {
      title: "Erro inesperado",
      fatal: false,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    showGlobalError(event.reason, {
      title: "Falha não tratada",
      fatal: false,
    });
  });
}

export function showGlobalError(error: unknown, options: GlobalErrorModalOptions = {}): void {
  if (typeof document === "undefined") {
    return;
  }

  const parsed = parseError(error);
  const title = options.title ?? "Erro da aplicação";
  const fatal = Boolean(options.fatal);
  const detailsText = buildDetailsText(parsed);

  const root = ensureModalRoot();
  const titleEl = root.querySelector<HTMLHeadingElement>("[data-global-error-title]");
  const messageEl = root.querySelector<HTMLDivElement>("[data-global-error-message]");
  const detailsEl = root.querySelector<HTMLPreElement>("[data-global-error-details]");
  const closeBtn = root.querySelector<HTMLButtonElement>("[data-global-error-close]");
  const reloadBtn = root.querySelector<HTMLButtonElement>("[data-global-error-reload]");
  const copyBtn = root.querySelector<HTMLButtonElement>("[data-global-error-copy]");

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (messageEl) {
    messageEl.textContent = parsed.summary;
  }

  if (detailsEl) {
    detailsEl.textContent = detailsText;
  }

  if (closeBtn) {
    closeBtn.style.display = fatal ? "none" : "inline-block";
    closeBtn.onclick = () => {
      root.style.display = "none";
    };
  }

  if (reloadBtn) {
    reloadBtn.onclick = () => {
      window.location.reload();
    };
  }

  if (copyBtn) {
    copyBtn.onclick = async () => {
      const copyText = `[${title}] ${parsed.summary}\n\n${detailsText}`;

      try {
        await navigator.clipboard.writeText(copyText);
      } catch {
        // Clipboard may not be available in all runtimes.
      }
    };
  }

  root.style.display = "flex";
}

type ParsedErrorInfo = {
  summary: string;
  details: string[];
};

function parseError(error: unknown): ParsedErrorInfo {
  if (error instanceof ClientHttpError) {
    return {
      summary: error.message,
      details: [
        `timestamp=${new Date().toISOString()}`,
        `status=${error.status}`,
        `statusText=${error.statusText}`,
        `method=${error.method}`,
        `path=${error.path}`,
        ...(error.code ? [`code=${error.code}`] : []),
        ...(error.traceId ? [`traceId=${error.traceId}`] : []),
        ...(error.issue ? [`issue=${error.issue}`] : []),
      ],
    };
  }

  if (error instanceof Error) {
    return {
      summary: error.message || "Erro inesperado",
      details: [
        `timestamp=${new Date().toISOString()}`,
        ...(error.name ? [`name=${error.name}`] : []),
        ...(error.stack ? [error.stack] : []),
      ],
    };
  }

  return {
    summary: String(error ?? "Erro inesperado"),
    details: [`timestamp=${new Date().toISOString()}`],
  };
}

function buildDetailsText(parsed: ParsedErrorInfo): string {
  return parsed.details.join("\n");
}

function ensureModalRoot(): HTMLDivElement {
  if (modalRoot) {
    return modalRoot;
  }

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.display = "none";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.padding = "20px";
  root.style.background = "rgba(7, 10, 18, 0.9)";
  root.style.zIndex = "10000";

  root.innerHTML = `
    <div style="width:min(92vw,680px);max-height:88vh;overflow:auto;background:#121a2e;border:1px solid #2f3a55;border-radius:12px;padding:16px;color:#fff;box-shadow:0 20px 42px rgba(0,0,0,0.5);">
      <h2 data-global-error-title style="margin:0 0 8px 0;font-size:20px;">Erro da aplicação</h2>
      <div data-global-error-message style="margin:0 0 10px 0;font-size:13px;color:#ffd7d7;line-height:1.4;"></div>
      <pre data-global-error-details style="margin:0 0 12px 0;padding:10px;border-radius:8px;background:#0f1728;border:1px solid #2f3a55;font-size:12px;color:#d6e3ff;white-space:pre-wrap;word-break:break-word;"></pre>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button data-global-error-copy style="padding:8px 10px;background:#365f9f;border:none;color:#fff;border-radius:6px;cursor:pointer;">Copiar detalhes</button>
        <button data-global-error-reload style="padding:8px 10px;background:#1d8f63;border:none;color:#fff;border-radius:6px;cursor:pointer;">Recarregar</button>
        <button data-global-error-close style="padding:8px 10px;background:#3e4c69;border:none;color:#fff;border-radius:6px;cursor:pointer;">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(root);
  modalRoot = root;
  return root;
}
