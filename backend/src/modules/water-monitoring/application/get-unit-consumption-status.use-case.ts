import { Inject, Injectable } from '@nestjs/common';
import { computeConsumptionStatus, type ConsumptionStatus } from '../domain/consumption-status';
import { requireUnit } from '../domain/manual-reading';
import {
  WATER_READING_REPOSITORY,
  type WaterReadingRepository,
} from '../domain/water-reading.repository';

/**
 * Caso de uso: estado de consumo de UMA unidade (R05) — consumo atual (ultima
 * leitura por timestamp) e se esta "Sem dados recentes" (mais de 15 minutos).
 *
 * Uma unidade sem nenhuma leitura devolve `no-data` (nao ha cadastro de unidades;
 * qualquer unitId e aceito, como no restante do modulo).
 */
@Injectable()
export class GetUnitConsumptionStatus {
  constructor(
    @Inject(WATER_READING_REPOSITORY)
    private readonly readings: WaterReadingRepository,
  ) {}

  async execute(unitId: unknown, now: Date = new Date()): Promise<ConsumptionStatus> {
    const unit = requireUnit(unitId);
    const latest = await this.readings.findLatestByUnit(unit);
    return computeConsumptionStatus(unit, latest, now);
  }
}
