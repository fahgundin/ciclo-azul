import { describe, it, expect } from 'vitest';
import { APP_ROUTES, canAccessRoute, routesFor } from './routes';
import { APP_ROLES } from '../auth/roles';

const paths = (roles: Parameters<typeof routesFor>[0]) => routesFor(roles).map((r) => r.path);

describe('routesFor', () => {
  it('Administrador: painel, usuarios e auditoria', () => {
    expect(paths([APP_ROLES.ADMINISTRADOR])).toEqual(['/painel', '/usuarios', '/auditoria']);
  });

  it('Gestor Ambiental: painel, agua, residuos, reuso e relatorios', () => {
    expect(paths([APP_ROLES.GESTOR_AMBIENTAL])).toEqual([
      '/painel',
      '/agua',
      '/residuos',
      '/insights',
      '/relatorios',
    ]);
  });

  it('Operador: painel, agua e sensores', () => {
    expect(paths([APP_ROLES.OPERADOR])).toEqual(['/painel', '/agua', '/sensores']);
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
