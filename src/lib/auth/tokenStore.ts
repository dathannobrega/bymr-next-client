/**
 * SECURITY NOTE:
 * - Do NOT use localStorage/sessionStorage for long-lived auth tokens.
 * - For desktop (.exe) we store the token in OS credential store via Tauri command + keyring.
 * - For web deployment, prefer HttpOnly cookies issued by the server (session/refresh token model).
 */

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string | null): Promise<void>;
}

export class MemoryTokenStore implements TokenStore {
  private token: string | null = null;

  async get(): Promise<string | null> {
    return this.token;
  }

  async set(token: string | null): Promise<void> {
    this.token = token;
  }
}

type TauriCore = {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
};

/**
 * Desktop secure storage backed by OS keychain/keyring (via Tauri Rust command).
 * Security rule: if Tauri runtime exists, keyring failures MUST bubble up (no memory fallback).
 */
export class DesktopSecureTokenStore implements TokenStore {
  async get(): Promise<string | null> {
    const core = getTauriCore();
    if (!core) {
      throw new Error("DesktopSecureTokenStore requires Tauri runtime");
    }
    return core.invoke<string | null>("get_auth_token");
  }

  async set(token: string | null): Promise<void> {
    const core = getTauriCore();
    if (!core) {
      throw new Error("DesktopSecureTokenStore requires Tauri runtime");
    }

    if (token) {
      await core.invoke("set_auth_token", { token });
      return;
    }

    await core.invoke("clear_auth_token");
  }
}

function getTauriCore(): TauriCore | null {
  const tauri = (window as { __TAURI__?: { core?: TauriCore } }).__TAURI__;
  return tauri?.core ?? null;
}
