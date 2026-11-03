import { extractRoles, toAuthenticatedUser } from './oidc-token.verifier';
import { APP_ROLES } from './roles';

describe('extracao de roles do token', () => {
  it('extrai apenas roles conhecidos do realm', () => {
    const roles = extractRoles({
      realm_access: { roles: ['operador', 'uma-role-qualquer', 'diretoria'] },
    });
    expect(roles).toEqual([APP_ROLES.OPERADOR, APP_ROLES.DIRETORIA]);
  });

  it('retorna lista vazia quando nao ha realm_access', () => {
    expect(extractRoles({})).toEqual([]);
  });

  it('mapeia claims para o usuario autenticado', () => {
    const user = toAuthenticatedUser({
      sub: 'user-123',
      preferred_username: 'maria',
      realm_access: { roles: ['gestor-ambiental'] },
    });
    expect(user).toEqual({
      sub: 'user-123',
      username: 'maria',
      roles: [APP_ROLES.GESTOR_AMBIENTAL],
    });
  });
});
