import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { APP_ROLES, type AppRole } from './roles';
import { ROLES_KEY } from './roles.decorator';

/** Monta um ExecutionContext falso com o usuario e os roles exigidos. */
function makeContext(userRoles: AppRole[], requiredRoles?: AppRole[]) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key) => (key === ROLES_KEY ? requiredRoles : undefined));

  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user: { roles: userRoles } }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard (RBAC)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('permite quando a rota nao declara roles', () => {
    const { guard, context } = makeContext([APP_ROLES.OPERADOR], undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando o usuario tem o role exigido', () => {
    const { guard, context } = makeContext([APP_ROLES.OPERADOR], [APP_ROLES.OPERADOR]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando o usuario tem ao menos um dos roles exigidos', () => {
    const { guard, context } = makeContext(
      [APP_ROLES.DIRETORIA],
      [APP_ROLES.ADMINISTRADOR, APP_ROLES.DIRETORIA],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('nega (Forbidden) quando o usuario nao tem o role exigido', () => {
    const { guard, context } = makeContext([APP_ROLES.OPERADOR], [APP_ROLES.GESTOR_AMBIENTAL]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('nega quando o usuario nao tem role algum', () => {
    const { guard, context } = makeContext([], [APP_ROLES.ADMINISTRADOR]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
