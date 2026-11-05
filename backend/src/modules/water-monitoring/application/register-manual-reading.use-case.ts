import { Inject, Injectable } from '@nestjs/common';
import { MANUAL_READING_SENSOR_ID } from '@ciclo-azul/contracts';
import { WaterReading } from '../domain/water-reading';
import {
  WATER_READING_REPOSITORY,
  type WaterReadingRepository,
} from '../domain/water-reading.repository';
import { SENSOR_REPOSITORY, type SensorRepository } from '../domain/sensor.repository';
import {
  UnitHasSensorError,
  requirePositiveVolume,
  requireReadingDate,
  requireUnit,
} from '../domain/manual-reading';

/**
 * Caso de uso: registrar uma leitura manual de consumo (R04).
 *
 * Regras: so para unidade SEM sensor conectado; volume > 0; data entre hoje e os
 * ultimos 28 dias. A leitura fica associada a unidade e disponivel no historico.
 */
@Injectable()
export class RegisterManualReading {
  constructor(
    @Inject(SENSOR_REPOSITORY)
    private readonly sensors: SensorRepository,
    @Inject(WATER_READING_REPOSITORY)
    private readonly readings: WaterReadingRepository,
  ) {}

  async execute(
    input: { unitId: unknown; valueInLiters: unknown; date: unknown },
    now: Date = new Date(),
  ): Promise<WaterReading> {
    const unitId = requireUnit(input.unitId);
    const valueInLiters = requirePositiveVolume(input.valueInLiters);
    const timestamp = requireReadingDate(input.date, now);

    if ((await this.sensors.findByUnit(unitId)).length > 0) {
      throw new UnitHasSensorError(unitId);
    }

    const reading = WaterReading.create({
      sensorId: MANUAL_READING_SENSOR_ID,
      unitId,
      timestamp,
      valueInLiters,
      readingType: 'manual',
    });
    await this.readings.save(reading);
    return reading;
  }
}
