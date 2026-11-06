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
    return this.latestOf(this.readings.filter((r) => r.unitId === unitId));
  }

  async findLatestPerUnit(): Promise<WaterReading[]> {
    const latestByUnit = new Map<string, WaterReading>();
    for (const reading of this.readings) {
      const current = latestByUnit.get(reading.unitId);
      if (!current || reading.timestamp.getTime() >= current.timestamp.getTime()) {
        latestByUnit.set(reading.unitId, reading);
      }
    }
    return [...latestByUnit.values()];
  }

  /** A mais recente por TIMESTAMP da medicao (nao pela ordem de insercao). */
  private latestOf(list: WaterReading[]): WaterReading | null {
    let latest: WaterReading | null = null;
    for (const reading of list) {
      if (!latest || reading.timestamp.getTime() >= latest.timestamp.getTime()) {
        latest = reading;
      }
    }
    return latest;
  }

  async findByUnit(unitId: string): Promise<WaterReading[]> {
    return this.readings
      .filter((r) => r.unitId === unitId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
