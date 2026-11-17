import { describe, it, expect } from 'vitest';
import {
  ACCESS_DENIED_MESSAGE,
  APP_ROUTES,
  canAccessRoute,
  forbiddenRoutes,
  routesFor,
} from './routes';
import { APP_ROLES } from '../auth/roles';

const paths = (roles: Parameters<typeof routesFor>[0]) => routesFor(roles).map((r) => r.path);

describe('routesFor', () => {
  it('Administrador: painel, usuarios e auditoria', () => {
    expect(paths([APP_ROLES.ADMINISTRADOR])).toEqual(['/painel', '/usuarios', '/auditoria']);
  });

  it('Gestor Ambiental: painel, agua, residuos, alertas, reuso e relatorios', () => {
    expect(paths([APP_ROLES.GESTOR_AMBIENTAL])).toEqual([
      '/painel',
      '/agua',
      '/residuos',
      '/alertas',
      '/insights',
      '/relatorios',
    ]);
  });

  it('Operador: painel, agua, alertas e sensores', () => {
    expect(paths([APP_ROLES.OPERADOR])).toEqual(['/painel', '/agua', '/alertas', '/sensores']);
  });

  it('Diretoria: so o painel por enquanto (residuos aguarda liberacao no backend)', () => {
    expect(paths([APP_ROLES.DIRETORIA])).toEqual(['/painel']);
  });

  it('sem perfis conhecidos: so o painel, que e para todos', () => {
    expect(paths([])).toEqual(['/painel']);
  });

  it('mantem a ordem do menu mesmo com varios perfis', () => {
    expect(paths([APP_ROLES.ADMINISTRADOR, APP_ROLES.OPERADOR])).toEqual([
      '/painel',
      '/agua',
      '/alertas',
      '/sensores',
      '/usuarios',
      '/auditoria',
    ]);
  });
});

describe('canAccessRoute', () => {
  it('permite rotas do perfil e bloqueia as demais', () => {
    expect(canAccessRoute([APP_ROLES.OPERADOR], '/sensores')).toBe(true);
    expect(canAccessRoute([APP_ROLES.OPERADOR], '/usuarios')).toBe(false);
    expect(canAccessRoute([APP_ROLES.GESTOR_AMBIENTAL], '/residuos')).toBe(true);
  });

  it('bloqueia caminhos desconhecidos', () => {
    expect(canAccessRoute([APP_ROLES.GESTOR_AMBIENTAL], '/nao-existe')).toBe(false);
  });
});

describe('APP_ROUTES', () => {
  it('nao repete caminhos', () => {
    const all = APP_ROUTES.map((r) => r.path);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('forbiddenRoutes', () => {
  it('Operador nao acessa usuarios, auditoria, residuos, reuso nem relatorios', () => {
    expect(forbiddenRoutes([APP_ROLES.OPERADOR]).map((r) => r.path)).toEqual([
      '/residuos',
      '/insights',
      '/relatorios',
      '/usuarios',
      '/auditoria',
    ]);
  });

  it('e o complemento exato das rotas permitidas', () => {
    for (const role of Object.values(APP_ROLES)) {
      const allowed = routesFor([role]).map((r) => r.path);
      const denied = forbiddenRoutes([role]).map((r) => r.path);
      expect([...allowed, ...denied].sort()).toEqual(APP_ROUTES.map((r) => r.path).sort());
    }
  });

  it('a mensagem e a da HU01', () => {
    expect(ACCESS_DENIED_MESSAGE).toBe('Você não tem permissão para acessar esta funcionalidade');
  });
});
