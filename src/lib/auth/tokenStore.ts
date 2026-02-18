/**
 * SECURITY NOTE:
 * - Do NOT use localStorage/sessionStorage for long-lived auth tokens.
 * - For desktop (.exe) we recommend storing the token in the OS credential store via a Tauri keyring plugin.
 * - For web deployment, prefer HttpOnly cookies issued by the server (session/refresh token model).
 *
 * This file provides a minimal abstraction so we can switch implementations without touching the rest of the client.
 */

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string | null): Promise<void>;
}

export class MemoryTokenStore implements TokenStore {
  private token: string | null = null;
  async get() { return this.token; }
  async set(token: string | null) { this.token = token; }
}

/**
 * Placeholder for desktop secure storage.
 *
 * Implementation options (pick one):
 *  - OS keyring plugin (recommended) – simplest UX
 *  - Stronghold (encrypted vault) – requires handling password/derived key
 */
export class DesktopSecureTokenStore implements TokenStore {
  async get(): Promise<string | null> {
    // TODO: implement with a Tauri plugin (keyring/stronghold) and return stored token.
    return null;
  }
  async set(_token: string | null): Promise<void> {
    // TODO: implement with a Tauri plugin (keyring/stronghold).
  }
}
