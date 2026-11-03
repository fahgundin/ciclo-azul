/**
 * Configuracao OIDC lida do ambiente (Vite). Faz parte de core/ — agnostica de UI.
 * Ver docs/decisoes/0004-autenticacao-keycloak.md e 0005-pwa-frontend-desacoplado.md.
 */
export interface OidcConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
}

export function readOidcConfig(env: ImportMetaEnv): OidcConfig {
  return {
    issuer: env.VITE_OIDC_ISSUER ?? 'http://localhost:8080/realms/ciclo-azul',
    clientId: env.VITE_OIDC_CLIENT_ID ?? 'ciclo-azul-web',
    redirectUri: env.VITE_OIDC_REDIRECT_URI ?? 'http://localhost:5173/callback',
  };
}
