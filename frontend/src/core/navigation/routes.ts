import { can, PERMISSIONS, type Permission } from '../auth/permissions';
import type { AppRole } from '../auth/roles';

/** Nomes de icone (a UI mapeia cada nome para o desenho). */
export type IconName =
  | 'home'
  | 'drop'
  | 'flask'
  | 'sensor'
  | 'bulb'
  | 'file'
  | 'users'
  | 'list'
  | 'bell';

/** Rota de navegacao principal do app. */
export interface AppRoute {
  path: string;
  label: string;
  icon: IconName;
  /** Permissao exigida; `null` = todos os perfis autenticados. */
  permission: Permission | null;
}

/**
 * Todas as telas previstas na navegacao, na ordem em que aparecem no menu.
 *
 * A UI so exibe/registra as que ja tem pagina implementada (ver ui/pages.tsx);
 * conforme cada tela da migracao chega, basta registrar a pagina.
 *
 * PENDENCIA: '/residuos' exige `waste.types` (somente Gestor Ambiental) porque
 * hoje o backend restringe GET /waste-types a esse perfil. Quando a leitura for
 * liberada a Diretoria, passar para `waste.view` (ver docs/migracao-frontend.md).
 *
 * PENDENCIA: '/sensores' e so do Operador (escopo.md e HU02), embora o backend
 * tambem aceite o Administrador em POST /sensors. Ver "Perfis" em
 * docs/migracao-frontend.md antes de alterar.
 */
export const APP_ROUTES: readonly AppRoute[] = [
  { path: '/painel', label: 'Painel', icon: 'home', permission: null },
  { path: '/agua', label: 'Água', icon: 'drop', permission: PERMISSIONS.WATER_MONITOR },
  { path: '/residuos', label: 'Resíduos', icon: 'flask', permission: PERMISSIONS.WASTE_TYPES },
  { path: '/alertas', label: 'Alertas', icon: 'bell', permission: PERMISSIONS.ALERTS_VIEW },
  { path: '/sensores', label: 'Sensores', icon: 'sensor', permission: PERMISSIONS.SENSORS_MANAGE },
  { path: '/insights', label: 'Reuso', icon: 'bulb', permission: PERMISSIONS.INSIGHTS_VIEW },
  {
    path: '/relatorios',
    label: 'Relatórios',
    icon: 'file',
    permission: PERMISSIONS.REPORTS_GENERATE,
  },
  { path: '/usuarios', label: 'Usuários', icon: 'users', permission: PERMISSIONS.USERS_MANAGE },
  { path: '/auditoria', label: 'Auditoria', icon: 'list', permission: PERMISSIONS.AUDIT_VIEW },
];

/** Rotas que o conjunto de perfis pode acessar, na ordem do menu. */
export function routesFor(roles: readonly AppRole[]): AppRoute[] {
  return APP_ROUTES.filter((route) => route.permission === null || can(roles, route.permission));
}

/**
 * Rotas conhecidas que o conjunto de perfis NAO pode acessar. Quem digita o caminho de
 * uma delas recebe `ACCESS_DENIED_MESSAGE` (HU01, cenario 2), em vez de ser redirecionado.
 */
export function forbiddenRoutes(roles: readonly AppRole[]): AppRoute[] {
  return APP_ROUTES.filter((route) => !routesFor(roles).includes(route));
}

/** Mensagem exibida ao tentar abrir uma funcionalidade sem permissao (HU01). */
export const ACCESS_DENIED_MESSAGE = 'Você não tem permissão para acessar esta funcionalidade';

/** O conjunto de perfis pode acessar este caminho? Caminhos desconhecidos: nao. */
export function canAccessRoute(roles: readonly AppRole[], path: string): boolean {
  return routesFor(roles).some((route) => route.path === path);
}
