import type { OidcConfig } from './oidc-config';
import { deriveCodeChallenge, generateCodeVerifier } from './pkce';

/** Resultado da preparacao do login: URL de autorizacao + code_verifier a guardar. */
export interface AuthorizationRequest {
  url: string;
  codeVerifier: string;
  state: string;
}

/**
 * Cliente OIDC desacoplado da UI (authorization code + PKCE).
 *
 * Responsavel apenas por montar a requisicao de autorizacao. A UI decide como
 * redirecionar e onde guardar o code_verifier/state. Mantem core/ agnostico.
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
}
