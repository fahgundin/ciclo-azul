import { isAppRole, type AppRole } from './roles';

/** Dados do usuario autenticado, extraidos do access token. */
export interface TokenUser {
  name: string;
  email: string | null;
  roles: AppRole[];
}

type Claims = Record<string, unknown>;

/**
 * Decodifica o payload (claims) de um JWT. Apenas LEITURA para apresentacao e
 * navegacao: a assinatura NAO e verificada aqui — quem garante a autorizacao
 * de verdade e o backend (JwtAuthGuard + RolesGuard), que valida cada chamada.
 */
export function decodeJwtPayload(token: string): Claims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Claims)
      : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Extrai apenas os roles conhecidos de `realm_access.roles`. */
export function extractRoles(claims: Claims): AppRole[] {
  const realmAccess = claims.realm_access;
  if (typeof realmAccess !== 'object' || realmAccess === null) {
    return [];
  }
  const roles = (realmAccess as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((role): role is AppRole => typeof role === 'string' && isAppRole(role));
}

/** Monta o usuario a partir do access token; `null` se o token for ausente/invalido. */
export function userFromToken(token: string | null): TokenUser | null {
  if (!token) {
    return null;
  }
  const claims = decodeJwtPayload(token);
  if (!claims) {
    return null;
  }
  const email = asString(claims.email);
  return {
    name: asString(claims.name) ?? asString(claims.preferred_username) ?? email ?? 'Usuário',
    email,
    roles: extractRoles(claims),
  };
}
