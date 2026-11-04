/**
 * Sessao de autenticacao (core/) — guarda o token e os dados transientes do
 * fluxo PKCE (code_verifier/state). Usa um Storage injetavel (localStorage no
 * browser; um fake nos testes), mantendo core/ testavel e agnostico.
 */

/** Contrato minimo de armazenamento (compativel com Web Storage). */
export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const TOKEN_KEY = 'ciclo-azul.access_token';
const VERIFIER_KEY = 'ciclo-azul.pkce_verifier';
const STATE_KEY = 'ciclo-azul.oauth_state';

export class AuthSession {
  constructor(private readonly storage: SessionStorageLike) {}

  /** Guarda os dados transientes do inicio do fluxo (antes do redirect). */
  savePending(codeVerifier: string, state: string): void {
    this.storage.setItem(VERIFIER_KEY, codeVerifier);
    this.storage.setItem(STATE_KEY, state);
  }

  getPendingVerifier(): string | null {
    return this.storage.getItem(VERIFIER_KEY);
  }

  getPendingState(): string | null {
    return this.storage.getItem(STATE_KEY);
  }

  clearPending(): void {
    this.storage.removeItem(VERIFIER_KEY);
    this.storage.removeItem(STATE_KEY);
  }

  /** Persiste o token de acesso apos a troca do code. */
  setToken(token: string): void {
    this.storage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return this.storage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /** Encerra a sessao (logout local). */
  clear(): void {
    this.storage.removeItem(TOKEN_KEY);
    this.clearPending();
  }
}
