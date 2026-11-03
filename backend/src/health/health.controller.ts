import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/**
 * Endpoint de verificacao de saude do servico.
 *
 * Marcado como @Public: unica rota isenta do JwtAuthGuard global. Todas as demais
 * rotas exigem token valido (ver AGENTS.md secao 1).
 */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
