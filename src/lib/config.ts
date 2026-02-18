export type ClientConfig = {
  /** Example: http://localhost:3001 */
  baseUrl: string;
  /** Example: v1.5.0-beta (server currently returns this from getApiVersion()) */
  apiVersion: string;
  /** Example: http://localhost:3001 (or CDN host) */
  cdnUrl: string;
  /** Enable verbose logs in client */
  debug: boolean;
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
    debug: import.meta.env.VITE_BYMR_DEBUG === "true",
  };

  const merged: ClientConfig = {
    baseUrl: "http://localhost:3001",
    apiVersion: "v1.5.0-beta",
    cdnUrl: "http://localhost:3001",
    debug: true,
    ...fromEnv,
    ...fromFile,
    ...injected,
  };

  if (!merged.baseUrl) throw new Error("Missing config.baseUrl");
  if (!merged.apiVersion) throw new Error("Missing config.apiVersion");
  if (!merged.cdnUrl) throw new Error("Missing config.cdnUrl");

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
