import { audienceMatches, extractRoles, toAuthenticatedUser } from './oidc-token.verifier';
import { APP_ROLES } from './roles';

describe('audienceMatches (client publico)', () => {
  const EXPECTED = 'ciclo-azul-web';

  it('aceita quando o clientId esta no aud (string)', () => {
    expect(audienceMatches({ aud: EXPECTED }, EXPECTED)).toBe(true);
  });

  it('aceita quando o clientId esta no aud (array)', () => {
    expect(audienceMatches({ aud: ['account', EXPECTED] }, EXPECTED)).toBe(true);
  });

  it('aceita via azp quando o aud nao traz o clientId (caso client publico)', () => {
    expect(audienceMatches({ aud: 'account', azp: EXPECTED }, EXPECTED)).toBe(true);
  });

  it('rejeita quando nem aud nem azp batem', () => {
    expect(audienceMatches({ aud: 'account', azp: 'outro' }, EXPECTED)).toBe(false);
  });

  it('rejeita quando nao ha aud nem azp', () => {
    expect(audienceMatches({}, EXPECTED)).toBe(false);
  });
});

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
