import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { OidcTokenVerifier } from './oidc-token.verifier';
import type { RequestWithUser } from './authenticated-user';

/** Estrutura minima de request que o guard precisa (sem depender de express). */
interface HttpRequest extends RequestWithUser {
  headers: { authorization?: string };
}

/**
 * Guard global: exige um token OIDC valido em TODAS as rotas, exceto as marcadas
 * com @Public(). Anexa o usuario autenticado em request.user.
 *
 * Cumpre a regra "nenhuma rota de API sem autenticacao" (AGENTS.md secao 1).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: OidcTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Token de autenticacao ausente');
    }

    try {
      request.user = await this.verifier.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token de autenticacao invalido');
    }
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }
    const [scheme, value] = authorization.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
