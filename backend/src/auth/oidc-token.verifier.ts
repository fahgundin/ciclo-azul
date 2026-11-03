import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AppRole } from './roles';
import { APP_ROLES } from './roles';
import type { AuthenticatedUser } from './authenticated-user';

const KNOWN_ROLES = new Set<string>(Object.values(APP_ROLES));

/**
 * Formato (parcial) das claims de um token Keycloak relevantes para RBAC.
 * `realm_access.roles` traz os roles do realm.
 */
interface KeycloakClaims extends JWTPayload {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

/**
 * Extrai os roles conhecidos do sistema a partir das claims do token.
 * Funcao PURA — testavel sem rede. Ignora roles desconhecidos do Keycloak.
 */
export function extractRoles(claims: KeycloakClaims): AppRole[] {
  const roles = claims.realm_access?.roles ?? [];
  return roles.filter((r): r is AppRole => KNOWN_ROLES.has(r));
}

/**
 * Mapeia claims validadas para o usuario autenticado da aplicacao.
 */
export function toAuthenticatedUser(claims: KeycloakClaims): AuthenticatedUser {
  return {
    sub: String(claims.sub ?? ''),
    username: claims.preferred_username,
    roles: extractRoles(claims),
  };
}

/**
 * Verificador de token OIDC usando o JWKS do realm (chaves publicas).
 *
 * Valida assinatura, `issuer` e `audience` sem introspeccao remota por request
 * (o JWKS e cacheado pela jose). Config vem do ambiente (OIDC_ISSUER/OIDC_AUDIENCE).
 */
@Injectable()
export class OidcTokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    this.issuer = process.env.OIDC_ISSUER ?? 'http://localhost:8080/realms/ciclo-azul';
    this.audience = process.env.OIDC_AUDIENCE ?? 'ciclo-azul-web';
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/protocol/openid-connect/certs`));
  }

  /** Verifica o token e retorna o usuario autenticado; lanca se invalido. */
  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return toAuthenticatedUser(payload as KeycloakClaims);
  }
}
