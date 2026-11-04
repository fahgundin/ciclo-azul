/**
 * Papeis (roles) do sistema (core/ — agnostico de UI).
 *
 * Espelha os roles do realm Keycloak (infra/keycloak/realm-ciclo-azul.json) e o
 * `APP_ROLES` do backend. Nomes em kebab-case, exatamente como vem no token.
 */
export const APP_ROLES = {
  ADMINISTRADOR: 'administrador',
  GESTOR_AMBIENTAL: 'gestor-ambiental',
  OPERADOR: 'operador',
  DIRETORIA: 'diretoria',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

/** Nome de exibicao de cada perfil. */
export const ROLE_LABELS: Record<AppRole, string> = {
  [APP_ROLES.ADMINISTRADOR]: 'Administrador',
  [APP_ROLES.GESTOR_AMBIENTAL]: 'Gestor Ambiental',
  [APP_ROLES.OPERADOR]: 'Operador de Infraestrutura',
  [APP_ROLES.DIRETORIA]: 'Diretoria',
};

const KNOWN_ROLES: readonly string[] = Object.values(APP_ROLES);

/** Type guard: o valor e um dos perfis conhecidos do sistema? */
export function isAppRole(value: string): value is AppRole {
  return KNOWN_ROLES.includes(value);
}
