import { can, PERMISSIONS, type Permission } from '../auth/permissions';
import type { AppRole } from '../auth/roles';

/** Nomes de icone (a UI mapeia cada nome para o desenho). */
export type IconName = 'home' | 'drop' | 'flask' | 'sensor' | 'bulb' | 'file' | 'users' | 'list';

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
 */
export const APP_ROUTES: readonly AppRoute[] = [
  { path: '/painel', label: 'Painel', icon: 'home', permission: null },
  { path: '/agua', label: 'Água', icon: 'drop', permission: PERMISSIONS.WATER_MONITOR },
  { path: '/residuos', label: 'Resíduos', icon: 'flask', permission: PERMISSIONS.WASTE_TYPES },
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

/** O conjunto de perfis pode acessar este caminho? Caminhos desconhecidos: nao. */
export function canAccessRoute(roles: readonly AppRole[], path: string): boolean {
  return routesFor(roles).some((route) => route.path === path);
}
