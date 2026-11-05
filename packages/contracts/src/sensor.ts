import type { ReadingType } from './water-consumption.js';

/**
 * Contrato de sensores e leituras de consumo (R04). Compartilhado entre backend e
 * frontend.
 */

/** Estado do sensor. Hoje so existe "connected" (exibido como "Conectado"). */
export type SensorStatus = 'connected';

/** Dados para vincular um sensor IoT a uma unidade. */
export interface LinkSensorInput {
  sensorId: string;
  unitId: string;
}

/** Representacao de leitura de um sensor vinculado. */
export interface SensorView {
  sensorId: string;
  unitId: string;
  status: SensorStatus;
  /** ISO 8601 UTC. */
  linkedAt: string;
}

/** Dados para lancar uma leitura manual (unidade sem sensor). */
export interface ManualReadingInput {
  unitId: string;
  /** Volume consumido, em litros (> 0). */
  valueInLiters: number;
  /** Data da leitura (ISO 8601; pode ser so a data, ex.: 2026-11-05). */
  date: string;
}

/** Representacao de leitura de uma leitura de consumo (sensor ou manual). */
export interface WaterReadingView {
  sensorId: string;
  unitId: string;
  /** ISO 8601 UTC. */
  timestamp: string;
  valueInLiters: number;
  readingType: ReadingType;
}

/** Idade maxima (em dias) aceita para uma leitura manual. */
export const MANUAL_READING_MAX_AGE_DAYS = 28;

/** sensorId usado nas leituras manuais (nao e um sensor fisico). */
export const MANUAL_READING_SENSOR_ID = 'manual';
