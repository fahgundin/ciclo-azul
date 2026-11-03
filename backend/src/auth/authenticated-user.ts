import type { AppRole } from './roles';

/** Usuario autenticado, derivado das claims do token OIDC validado. */
export interface AuthenticatedUser {
  /** subject (claim `sub`) — identificador do usuario no Keycloak. */
  sub: string;
  /** nome de usuario preferido (claim `preferred_username`), se presente. */
  username?: string;
  /** roles do realm extraidos do token. */
  roles: AppRole[];
}

/** Extende o Request do Express com o usuario autenticado. */
export interface RequestWithUser {
  user?: AuthenticatedUser;
}
