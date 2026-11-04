import type { OidcConfig } from './oidc-config';
import { deriveCodeChallenge, generateCodeVerifier } from './pkce';

/** Resultado da preparacao do login: URL de autorizacao + code_verifier a guardar. */
export interface AuthorizationRequest {
  url: string;
  codeVerifier: string;
  state: string;
}

/** Tokens retornados pelo endpoint de token do Keycloak. */
export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Cliente OIDC desacoplado da UI (authorization code + PKCE).
 *
 * Responsavel por montar a requisicao de autorizacao e trocar o authorization
 * code por tokens. A UI decide como redirecionar e onde guardar o token. Mantem
 * core/ agnostico.
 */
export class OidcClient {
  constructor(private readonly config: OidcConfig) {}

  /** Prepara a requisicao de autorizacao (gera PKCE e monta a URL). */
  async createAuthorizationRequest(): Promise<AuthorizationRequest> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await deriveCodeChallenge(codeVerifier);
    const state = generateCodeVerifier(32);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    const url = `${this.config.issuer}/protocol/openid-connect/auth?${params.toString()}`;
    return { url, codeVerifier, state };
  }

  /**
   * Troca o authorization code (recebido no callback) por tokens, usando o
   * code_verifier guardado no inicio do fluxo (PKCE). Client publico: sem secret.
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code,
      code_verifier: codeVerifier,
    });

    const res = await fetch(`${this.config.issuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      // Expoe o motivo real do Keycloak (ex.: invalid_grant, invalid_client)
      // para facilitar o diagnostico em vez de mascarar com um status generico.
      let detail = '';
      try {
        const err = (await res.json()) as { error?: string; error_description?: string };
        detail = [err.error, err.error_description].filter(Boolean).join(': ');
      } catch {
        // resposta sem JSON
      }
      throw new Error(
        `Falha ao trocar o code por token: ${res.status}${detail ? ` (${detail})` : ''}`,
      );
    }
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
    };
  }
}
