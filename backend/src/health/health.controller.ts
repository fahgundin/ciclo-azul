import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint de verificacao de saude do servico.
 *
 * NOTA: na F3 (Keycloak) toda rota passara a exigir autenticacao via guard
 * global. Este endpoint devera ser marcado explicitamente como publico quando
 * o guard for introduzido.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
