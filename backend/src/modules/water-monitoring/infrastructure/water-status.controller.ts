import { Controller, Get, Param } from '@nestjs/common';
import { STALE_AFTER_MINUTES, type UnitConsumptionStatus } from '@ciclo-azul/contracts';
import { Roles } from '../../../auth/roles.decorator';
import { APP_ROLES } from '../../../auth/roles';
import { GetUnitConsumptionStatus } from '../application/get-unit-consumption-status.use-case';
import { ListUnitsConsumptionStatus } from '../application/list-units-consumption-status.use-case';
import type { ConsumptionStatus } from '../domain/consumption-status';
import { toHttpException } from './http-errors';

/**
 * API do estado de consumo por unidade (R05).
 *
 * Complementa o canal WebSocket (F5): o WebSocket entrega cada leitura nova, e estas
 * rotas dao o estado ATUAL (consumo atual e "Sem dados recentes"), usado ao abrir o
 * painel e para recalcular periodicamente. A transicao para "Sem dados recentes" nao
 * e emitida pelo WebSocket: o cliente recalcula pelo `lastReadingAt` e
 * `staleAfterMinutes`, ou consulta de novo.
 *
 * Autenticacao: JwtAuthGuard global (F3). Consulta liberada aos quatro perfis.
 */
@Controller('water-status')
export class WaterStatusController {
  constructor(
    private readonly getUnitStatus: GetUnitConsumptionStatus,
    private readonly listUnitsStatus: ListUnitsConsumptionStatus,
  ) {}

  @Get()
  @Roles(
    APP_ROLES.OPERADOR,
    APP_ROLES.ADMINISTRADOR,
    APP_ROLES.GESTOR_AMBIENTAL,
    APP_ROLES.DIRETORIA,
  )
  async list(): Promise<UnitConsumptionStatus[]> {
    return (await this.listUnitsStatus.execute()).map((s) => this.toView(s));
  }

  @Get(':unitId')
  @Roles(
    APP_ROLES.OPERADOR,
    APP_ROLES.ADMINISTRADOR,
    APP_ROLES.GESTOR_AMBIENTAL,
    APP_ROLES.DIRETORIA,
  )
  async get(@Param('unitId') unitId: string): Promise<UnitConsumptionStatus> {
    try {
      return this.toView(await this.getUnitStatus.execute(unitId));
    } catch (err) {
      throw toHttpException(err);
    }
  }

  private toView(status: ConsumptionStatus): UnitConsumptionStatus {
    return {
      unitId: status.unitId,
      state: status.state,
      currentValueInLiters: status.currentValueInLiters,
      lastReadingAt: status.lastReadingAt ? status.lastReadingAt.toISOString() : null,
      lastReadingType: status.lastReadingType,
      staleAfterMinutes: STALE_AFTER_MINUTES,
    };
  }
}
