import { describe, it, expect } from 'vitest';
import { can, PERMISSIONS, ROLE_PERMISSIONS } from './permissions';
import { APP_ROLES, ROLE_LABELS, isAppRole } from './roles';

describe('can', () => {
  it('Administrador gerencia usuarios e ve auditoria, mas nao ve agua nem residuos', () => {
    const roles = [APP_ROLES.ADMINISTRADOR];
    expect(can(roles, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(can(roles, PERMISSIONS.AUDIT_VIEW)).toBe(true);
    expect(can(roles, PERMISSIONS.WATER_MONITOR)).toBe(false);
    expect(can(roles, PERMISSIONS.WASTE_VIEW)).toBe(false);
  });

  it('Gestor Ambiental cuida de residuos, limites, reuso e relatorios, mas nao de usuarios nem sensores', () => {
    const roles = [APP_ROLES.GESTOR_AMBIENTAL];
    expect(can(roles, PERMISSIONS.WASTE_TYPES)).toBe(true);
    expect(can(roles, PERMISSIONS.WATER_LIMITS)).toBe(true);
    expect(can(roles, PERMISSIONS.INSIGHTS_APPLY)).toBe(true);
    expect(can(roles, PERMISSIONS.REPORTS_GENERATE)).toBe(true);
    expect(can(roles, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(can(roles, PERMISSIONS.SENSORS_MANAGE)).toBe(false);
  });

  it('Operador monitora agua e gerencia sensores, mas nao ve residuos', () => {
    const roles = [APP_ROLES.OPERADOR];
    expect(can(roles, PERMISSIONS.WATER_MONITOR)).toBe(true);
    expect(can(roles, PERMISSIONS.SENSORS_MANAGE)).toBe(true);
    expect(can(roles, PERMISSIONS.WASTE_VIEW)).toBe(false);
    expect(can(roles, PERMISSIONS.REPORTS_GENERATE)).toBe(false);
  });

  it('Diretoria so le a destinacao de residuos', () => {
    const roles = [APP_ROLES.DIRETORIA];
    expect(can(roles, PERMISSIONS.WASTE_VIEW)).toBe(true);
    expect(can(roles, PERMISSIONS.WASTE_REGISTER)).toBe(false);
    expect(can(roles, PERMISSIONS.WATER_MONITOR)).toBe(false);
  });

  it('une as permissoes quando o usuario tem mais de um perfil', () => {
    const roles = [APP_ROLES.OPERADOR, APP_ROLES.DIRETORIA];
    expect(can(roles, PERMISSIONS.SENSORS_MANAGE)).toBe(true);
    expect(can(roles, PERMISSIONS.WASTE_VIEW)).toBe(true);
  });

  it('sem perfis nao concede nada', () => {
    Object.values(PERMISSIONS).forEach((permission) => {
      expect(can([], permission)).toBe(false);
    });
  });

  it('todo perfil tem uma entrada na matriz e um nome de exibicao', () => {
    Object.values(APP_ROLES).forEach((role) => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_LABELS[role]).toBeTruthy();
    });
  });
});

describe('isAppRole', () => {
  it('aceita perfis conhecidos e rejeita os demais', () => {
    expect(isAppRole('operador')).toBe(true);
    expect(isAppRole('gestor-ambiental')).toBe(true);
    expect(isAppRole('offline_access')).toBe(false);
    expect(isAppRole('')).toBe(false);
  });
});
