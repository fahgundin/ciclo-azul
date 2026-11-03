/**
 * Papeis (roles) do sistema, espelhando os roles do realm Keycloak
 * (infra/keycloak/realm-ciclo-azul.json). Nomes em kebab-case.
 */
export const APP_ROLES = {
  ADMINISTRADOR: 'administrador',
  GESTOR_AMBIENTAL: 'gestor-ambiental',
  OPERADOR: 'operador',
  DIRETORIA: 'diretoria',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];
