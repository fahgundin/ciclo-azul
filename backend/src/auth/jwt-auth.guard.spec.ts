import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OidcTokenVerifier } from './oidc-token.verifier';
import { IS_PUBLIC_KEY } from './public.decorator';
import { APP_ROLES } from './roles';
import type { AuthenticatedUser } from './authenticated-user';

function makeContext(authorization?: string) {
  const request: { headers: { authorization?: string }; user?: AuthenticatedUser } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let verifier: OidcTokenVerifier;

  beforeEach(() => {
    reflector = new Reflector();
    verifier = { verify: jest.fn() } as unknown as OidcTokenVerifier;
  });

  afterEach(() => jest.restoreAllMocks());

  it('libera rota marcada como @Public sem exigir token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );
    const guard = new JwtAuthGuard(reflector, verifier);
    const { context } = makeContext();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejeita quando o token esta ausente', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const guard = new JwtAuthGuard(reflector, verifier);
    const { context } = makeContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('aceita token valido e anexa o usuario ao request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const user: AuthenticatedUser = {
      sub: 'abc',
      username: 'op',
      roles: [APP_ROLES.OPERADOR],
    };
    (verifier.verify as jest.Mock).mockResolvedValue(user);

    const guard = new JwtAuthGuard(reflector, verifier);
    const { context, request } = makeContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(user);
  });

  it('rejeita token invalido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    (verifier.verify as jest.Mock).mockRejectedValue(new Error('invalid'));

    const guard = new JwtAuthGuard(reflector, verifier);
    const { context } = makeContext('Bearer bad-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
