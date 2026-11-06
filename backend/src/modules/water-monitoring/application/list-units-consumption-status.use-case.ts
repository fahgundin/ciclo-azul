import { Inject, Injectable } from '@nestjs/common';
import { computeConsumptionStatus, type ConsumptionStatus } from '../domain/consumption-status';
import { SENSOR_REPOSITORY, type SensorRepository } from '../domain/sensor.repository';
import {
  WATER_READING_REPOSITORY,
  type WaterReadingRepository,
} from '../domain/water-reading.repository';
import type { WaterReading } from '../domain/water-reading';

/**
 * Caso de uso: estado de consumo de TODAS as unidades conhecidas (R05).
 *
 * Como nao ha cadastro de unidades, uma unidade e "conhecida" se ja teve alguma
 * leitura OU se tem sensor vinculado. Unidade com sensor que ainda nao enviou nada
 * aparece como `no-data`. Resultado ordenado por unitId.
 */
@Injectable()
export class ListUnitsConsumptionStatus {
  constructor(
    @Inject(WATER_READING_REPOSITORY)
    private readonly readings: WaterReadingRepository,
    @Inject(SENSOR_REPOSITORY)
    private readonly sensors: SensorRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<ConsumptionStatus[]> {
    const [latestPerUnit, sensors] = await Promise.all([
      this.readings.findLatestPerUnit(),
      this.sensors.findAll(),
    ]);

    const latestByUnit = new Map<string, WaterReading>(latestPerUnit.map((r) => [r.unitId, r]));
    const unitIds = new Set<string>([...latestByUnit.keys(), ...sensors.map((s) => s.unitId)]);

    return [...unitIds]
      .sort((a, b) => a.localeCompare(b))
      .map((unitId) => computeConsumptionStatus(unitId, latestByUnit.get(unitId) ?? null, now));
  }
}
