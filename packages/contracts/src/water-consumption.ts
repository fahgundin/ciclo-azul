/**
 * Contrato de leitura de consumo de agua.
 * Reflete o payload MQTT documentado em docs/contrato-iot.md (versao v1).
 * Compartilhado entre backend e frontend para evitar definicoes divergentes.
 */

/** Origem da leitura: sensor fisico (via MQTT) ou lancamento manual (via API). */
export type ReadingType = 'sensor' | 'manual';

/** Metrica suportada neste contrato. */
export type WaterConsumptionMetric = 'water-consumption';

/** Unidade de medida da leitura. */
export type MeasurementUnit = 'liter';

/**
 * Leitura de consumo de agua conforme o contrato MQTT v1.
 * Ver docs/contrato-iot.md secao 3.
 */
export interface WaterConsumptionReading {
  /** Versao do schema do payload (ex.: "1.0"). */
  schemaVersion: string;
  /** Identificador unico do sensor de origem. */
  sensorId: string;
  /** Unidade (data center) a qual a leitura pertence. */
  unitId: string;
  /** Momento da medicao na origem, em ISO 8601 UTC. */
  timestamp: string;
  /** Metrica medida. */
  metric: WaterConsumptionMetric;
  /** Valor medido. */
  value: number;
  /** Unidade de medida. */
  unit: MeasurementUnit;
  /** Origem da leitura. */
  readingType: ReadingType;
  /** Contador monotonico opcional do sensor (deteccao de perda/duplicacao). */
  sequence?: number;
}

/** Namespace raiz dos topicos MQTT. */
export const MQTT_ROOT_NAMESPACE = 'ciclo-azul';

/** Versao atual do contrato MQTT. */
export const MQTT_CONTRACT_VERSION = 'v1';

/**
 * Monta o topico MQTT de leitura de consumo de agua de uma unidade.
 * Ex.: ciclo-azul/v1/sensors/data-center-sp-01/water-consumption
 */
export function waterConsumptionTopic(unitId: string): string {
  return `${MQTT_ROOT_NAMESPACE}/${MQTT_CONTRACT_VERSION}/sensors/${unitId}/water-consumption`;
}
