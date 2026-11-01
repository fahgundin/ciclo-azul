import type { WaterReading } from './water-reading';

/**
 * Port de saida (driven): abstracao de persistencia de leituras.
 * Implementado por adapters em infrastructure/ (ex.: Postgres na F2+).
 * O dominio depende desta interface, nunca de uma implementacao concreta.
 */
export interface WaterReadingRepository {
  save(reading: WaterReading): Promise<void>;
  findLatestByUnit(unitId: string): Promise<WaterReading | null>;
}

/** Token de injecao para o port (resolvido via DI do NestJS). */
export const WATER_READING_REPOSITORY = Symbol('WaterReadingRepository');
