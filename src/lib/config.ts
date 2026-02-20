export type ClientConfig = {
  /** Example: http://localhost:3001 */
  baseUrl: string;
  /** Example: v1.5.0-beta (server currently returns this from getApiVersion()) */
  apiVersion: string;
  /** Example: http://localhost:3001 (or CDN host) */
  cdnUrl: string;
  /** Optional build identifier used in version gate and telemetry. */
  clientBuild?: string;
  /** Enable verbose logs in client */
  debug: boolean;
  /** Extra strict allowlist for XHR/fetch destinations. */
  allowedConnectOrigins?: string[];
};

/**
 * Load configuration in this priority:
 *  1) window.__BYMR_CONFIG__ injected by wrapper/launcher
 *  2) /config.local.json (gitignored) for local dev
 *  3) Vite env vars (VITE_BYMR_*)
 */
export async function loadClientConfig(): Promise<ClientConfig> {
  const injected = (window as any).__BYMR_CONFIG__ as Partial<ClientConfig> | undefined;
  const fromFile = await tryLoadJson<Partial<ClientConfig>>("/config.local.json");
  const fromEnv: Partial<ClientConfig> = {
    baseUrl: import.meta.env.VITE_BYMR_BASE_URL,
    apiVersion: import.meta.env.VITE_BYMR_API_VERSION,
    cdnUrl: import.meta.env.VITE_BYMR_CDN_URL,
    clientBuild: import.meta.env.VITE_BYMR_CLIENT_BUILD,
    debug: import.meta.env.VITE_BYMR_DEBUG === "true",
    allowedConnectOrigins: parseCsv(import.meta.env.VITE_BYMR_ALLOWED_CONNECT_ORIGINS),
  };

  const merged: ClientConfig = {
    baseUrl: "http://localhost:3001",
    apiVersion: "v1.5.0-beta",
    cdnUrl: "http://localhost:3001",
    clientBuild: "dev",
    debug: true,
    ...fromEnv,
    ...fromFile,
    ...injected,
  };

  if (!merged.baseUrl) throw new Error("Missing config.baseUrl");
  if (!merged.apiVersion) throw new Error("Missing config.apiVersion");
  if (!merged.cdnUrl) throw new Error("Missing config.cdnUrl");

  const requiredOrigins = [new URL(merged.baseUrl).origin, new URL(merged.cdnUrl).origin];
  const configured = merged.allowedConnectOrigins ?? [];
  merged.allowedConnectOrigins = Array.from(new Set([...configured, ...requiredOrigins]));

  return merged;
}

async function tryLoadJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

function parseCsv(value?: string): string[] | undefined {
  if (!value) return undefined;
  const list = value.split(",").map((v) => v.trim()).filter(Boolean);
  return list.length ? list : undefined;
}
