/**
 * SECURITY NOTE:
 * - Do NOT use localStorage/sessionStorage for long-lived auth tokens.
 * - For desktop (.exe) we recommend storing the token in the OS credential store via a Tauri keyring plugin.
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

/**
 * Placeholder for desktop secure storage.
 *
 * TODO phase 2:
 *  - Replace fallback with Tauri keyring/stronghold implementation.
 */
export class DesktopSecureTokenStore implements TokenStore {
  private readonly fallback = new MemoryTokenStore();

  async get(): Promise<string | null> {
    return this.fallback.get();
  }

  async set(token: string | null): Promise<void> {
    await this.fallback.set(token);
  }
}
