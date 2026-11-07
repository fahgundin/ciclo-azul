import { APP_ROLES, type AppRole } from './roles';

/**
 * Permissoes por funcionalidade (core/ — agnostico de UI).
 *
 * Define o que cada perfil PODE VER/USAR na interface. E uma conveniencia de
 * navegacao: a autorizacao real e feita pelo backend em cada rota (@Roles).
 */
export const PERMISSIONS = {
  WATER_MONITOR: 'water.monitor',
  WATER_LIMITS: 'water.limits',
  SENSORS_MANAGE: 'sensors.manage',
  WASTE_TYPES: 'waste.types',
  WASTE_REGISTER: 'waste.register',
  WASTE_CONFIRM: 'waste.confirm',
  WASTE_VIEW: 'waste.view',
  INSIGHTS_VIEW: 'insights.view',
  INSIGHTS_APPLY: 'insights.apply',
  REPORTS_GENERATE: 'reports.generate',
  USERS_MANAGE: 'users.manage',
  AUDIT_VIEW: 'audit.view',
  ALERTS_VIEW: 'alerts.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Descricao de cada permissao, com o requisito de origem. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.WATER_MONITOR]: 'Monitorar consumo de água em tempo real (R05)',
  [PERMISSIONS.WATER_LIMITS]: 'Definir limites de consumo (R03)',
  [PERMISSIONS.SENSORS_MANAGE]: 'Conectar sensores e registrar leituras manuais (R04)',
  [PERMISSIONS.WASTE_TYPES]: 'Cadastrar e classificar tipos de resíduo (R07)',
  [PERMISSIONS.WASTE_REGISTER]: 'Criar lotes, registrar e retificar destinação (R06)',
  [PERMISSIONS.WASTE_CONFIRM]: 'Confirmar destinação de resíduo perigoso',
  [PERMISSIONS.WASTE_VIEW]: 'Ver dados de destinação: Gestor e Diretoria',
  [PERMISSIONS.INSIGHTS_VIEW]: 'Ver oportunidades de reuso (R02)',
  [PERMISSIONS.INSIGHTS_APPLY]: 'Aplicar oportunidades de reuso (R02)',
  [PERMISSIONS.REPORTS_GENERATE]: 'Gerar relatórios de conformidade (R09)',
  [PERMISSIONS.USERS_MANAGE]: 'Gerenciar usuários e perfis (R01)',
  [PERMISSIONS.AUDIT_VIEW]: 'Consultar histórico de auditoria',
  [PERMISSIONS.ALERTS_VIEW]: 'Ver alertas de consumo, sensores e lotes sem destinação (R03/R08)',
};

const P = PERMISSIONS;

/** Permissoes fixas por perfil (o Administrador atribui o perfil, nao edita a matriz). */
export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  [APP_ROLES.ADMINISTRADOR]: [P.USERS_MANAGE, P.AUDIT_VIEW],
  [APP_ROLES.GESTOR_AMBIENTAL]: [
    P.WATER_MONITOR,
    P.WATER_LIMITS,
    P.WASTE_TYPES,
    P.WASTE_REGISTER,
    P.WASTE_CONFIRM,
    P.WASTE_VIEW,
    P.INSIGHTS_VIEW,
    P.INSIGHTS_APPLY,
    P.REPORTS_GENERATE,
    P.ALERTS_VIEW,
  ],
  [APP_ROLES.OPERADOR]: [P.WATER_MONITOR, P.SENSORS_MANAGE, P.ALERTS_VIEW],
  [APP_ROLES.DIRETORIA]: [P.WASTE_VIEW],
};

/** O conjunto de perfis concede a permissao? (uniao das permissoes de cada perfil) */
export function can(roles: readonly AppRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
