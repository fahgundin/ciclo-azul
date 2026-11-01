import { Inject, Injectable } from '@nestjs/common';
import { WaterReading } from '../domain/water-reading';
import {
  WATER_READING_REPOSITORY,
  type WaterReadingRepository,
} from '../domain/water-reading.repository';
import type { ReadingType } from '@ciclo-azul/contracts';

/**
 * Caso de uso: registrar uma leitura de consumo de agua.
 *
 * Orquestra o dominio sem saber a origem (MQTT, API manual ou teste) nem o
 * destino de persistencia. Depende do port WaterReadingRepository.
 */
@Injectable()
export class RegisterWaterReading {
  constructor(
    @Inject(WATER_READING_REPOSITORY)
    private readonly repository: WaterReadingRepository,
  ) {}

  async execute(input: {
    sensorId: string;
    unitId: string;
    timestamp: Date;
    valueInLiters: number;
    readingType: ReadingType;
  }): Promise<void> {
    const reading = WaterReading.create(input);
    await this.repository.save(reading);
  }
}
