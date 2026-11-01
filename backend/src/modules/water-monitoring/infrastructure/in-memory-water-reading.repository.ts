import { Injectable } from '@nestjs/common';
import type { WaterReadingRepository } from '../domain/water-reading.repository';
import type { WaterReading } from '../domain/water-reading';

/**
 * Adapter de saida (driven) em memoria.
 *
 * PLACEHOLDER da F1: sera substituido por um adapter Postgres (TypeORM) na F2/
 * modulos, sem alterar dominio nem aplicacao (regra da dependencia hexagonal).
 */
@Injectable()
export class InMemoryWaterReadingRepository implements WaterReadingRepository {
  private readonly readings: WaterReading[] = [];

  async save(reading: WaterReading): Promise<void> {
    this.readings.push(reading);
  }

  async findLatestByUnit(unitId: string): Promise<WaterReading | null> {
    const list = this.readings.filter((r) => r.unitId === unitId);
    return list.at(-1) ?? null;
  }
}
