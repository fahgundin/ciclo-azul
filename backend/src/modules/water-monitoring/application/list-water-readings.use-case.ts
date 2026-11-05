import { Inject, Injectable } from '@nestjs/common';
import type { WaterReading } from '../domain/water-reading';
import {
  WATER_READING_REPOSITORY,
  type WaterReadingRepository,
} from '../domain/water-reading.repository';
import { requireUnit } from '../domain/manual-reading';

/** Caso de uso: historico de consumo de uma unidade, da leitura mais recente a mais antiga (R04). */
@Injectable()
export class ListWaterReadings {
  constructor(
    @Inject(WATER_READING_REPOSITORY)
    private readonly readings: WaterReadingRepository,
  ) {}

  async execute(unitId: unknown): Promise<WaterReading[]> {
    return this.readings.findByUnit(requireUnit(unitId));
  }
}
