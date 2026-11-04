import { describe, it, expect } from 'vitest';
import { makeToken, makeTokenWithRoles } from '../../test-utils';
import { decodeJwtPayload, extractRoles, userFromToken } from './token';
import { APP_ROLES } from './roles';

describe('decodeJwtPayload', () => {
  it('decodifica o payload de um JWT valido', () => {
    expect(decodeJwtPayload(makeToken({ sub: 'u1', name: 'Ana' }))).toEqual({
      sub: 'u1',
      name: 'Ana',
    });
  });

  it('preserva acentos (UTF-8)', () => {
    expect(decodeJwtPayload(makeToken({ name: 'João Conceição' }))).toEqual({
      name: 'João Conceição',
    });
  });

  it.each([
    ['vazio', ''],
    ['sem tres partes', 'abc.def'],
    ['payload nao e base64/JSON', 'aaa.%%%.ccc'],
    ['payload e JSON mas nao objeto', `a.${btoa('"texto"')}.c`],
    ['payload e array', `a.${btoa('[1,2]')}.c`],
  ])('retorna null para token invalido (%s)', (_caso, token) => {
    expect(decodeJwtPayload(token)).toBeNull();
  });
});

describe('extractRoles', () => {
  it('extrai apenas os roles conhecidos', () => {
    expect(
      extractRoles({ realm_access: { roles: ['operador', 'uma-role-qualquer', 'diretoria'] } }),
    ).toEqual([APP_ROLES.OPERADOR, APP_ROLES.DIRETORIA]);
  });

  it.each([
    ['sem realm_access', {}],
    ['realm_access nao e objeto', { realm_access: 'x' }],
    ['roles nao e lista', { realm_access: { roles: 'operador' } }],
    ['roles com itens que nao sao string', { realm_access: { roles: [1, null, {}] } }],
  ])('retorna lista vazia (%s)', (_caso, claims) => {
    expect(extractRoles(claims)).toEqual([]);
  });
});

describe('userFromToken', () => {
  it('monta nome, email e roles a partir do token', () => {
    const token = makeTokenWithRoles(['gestor-ambiental'], {
      name: 'Marina Costa',
      email: 'marina@ciclo.azul',
    });
    expect(userFromToken(token)).toEqual({
      name: 'Marina Costa',
      email: 'marina@ciclo.azul',
      roles: [APP_ROLES.GESTOR_AMBIENTAL],
    });
  });

  it('usa preferred_username quando nao ha name', () => {
    const token = makeTokenWithRoles([], { preferred_username: 'gestor' });
    expect(userFromToken(token)?.name).toBe('gestor');
  });

  it('usa o email quando nao ha name nem preferred_username', () => {
    const token = makeTokenWithRoles([], { email: 'a@b.c' });
    expect(userFromToken(token)?.name).toBe('a@b.c');
  });

  it('usa um nome padrao quando nao ha nenhuma claim de identificacao', () => {
    expect(userFromToken(makeTokenWithRoles([]))).toEqual({
      name: 'Usuário',
      email: null,
      roles: [],
    });
  });

  it('retorna null para token ausente ou invalido', () => {
    expect(userFromToken(null)).toBeNull();
    expect(userFromToken('')).toBeNull();
    expect(userFromToken('lixo')).toBeNull();
  });
});
