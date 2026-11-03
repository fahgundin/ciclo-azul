import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { AppRole } from './roles';
import type { RequestWithUser } from './authenticated-user';

/**
 * Guard de RBAC: quando a rota declara @Roles(...), exige que o usuario tenha ao
 * menos um dos roles. Sem @Roles, nao restringe (a autenticacao ja foi exigida
 * pelo JwtAuthGuard global).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userRoles = request.user?.roles ?? [];
    const allowed = required.some((role) => userRoles.includes(role));

    if (!allowed) {
      throw new ForbiddenException('Voce nao tem permissao para acessar este recurso');
    }
    return true;
  }
}
