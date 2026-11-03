import { SetMetadata } from '@nestjs/common';
import type { AppRole } from './roles';

/** Chave de metadado com os roles exigidos por uma rota. */
export const ROLES_KEY = 'requiredRoles';

/**
 * Exige que o usuario autenticado possua ao menos um dos roles informados.
 * Aplicado em conjunto com o RolesGuard. Ex.: @Roles(APP_ROLES.OPERADOR)
 */
export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
