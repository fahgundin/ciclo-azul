import type { WaterConsumptionReading } from '@ciclo-azul/contracts';

/** Resultado da validacao: sucesso com a leitura tipada, ou falha com o motivo. */
export type ValidationResult =
  | { valid: true; reading: WaterConsumptionReading }
  | { valid: false; error: string };

/** Tolerancia para timestamp no futuro (relogios dessincronizados). */
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida um payload bruto de leitura de consumo de agua contra o contrato v1
 * (docs/contrato-iot.md secao 3). Funcao PURA — testavel sem broker.
 *
 * Regras:
 * - campos obrigatorios presentes e com o tipo correto;
 * - metric === "water-consumption", unit === "liter";
 * - readingType em {sensor, manual};
 * - value numerico e nao negativo;
 * - timestamp ISO valido e nao no futuro (alem da tolerancia).
 */
export function validateReadingPayload(raw: unknown, now: Date = new Date()): ValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, error: 'payload nao e um objeto' };
  }
  const p = raw as Record<string, unknown>;

  if (!isNonEmptyString(p.schemaVersion)) {
    return { valid: false, error: 'schemaVersion ausente' };
  }
  if (!isNonEmptyString(p.sensorId)) {
    return { valid: false, error: 'sensorId ausente' };
  }
  if (!isNonEmptyString(p.unitId)) {
    return { valid: false, error: 'unitId ausente' };
  }
  if (p.metric !== 'water-consumption') {
    return { valid: false, error: 'metric invalida' };
  }
  if (p.unit !== 'liter') {
    return { valid: false, error: 'unit invalida' };
  }
  if (p.readingType !== 'sensor' && p.readingType !== 'manual') {
    return { valid: false, error: 'readingType invalido' };
  }
  if (typeof p.value !== 'number' || Number.isNaN(p.value) || p.value < 0) {
    return { valid: false, error: 'value deve ser numero nao negativo' };
  }
  if (!isNonEmptyString(p.timestamp)) {
    return { valid: false, error: 'timestamp ausente' };
  }
  const ts = new Date(p.timestamp);
  if (Number.isNaN(ts.getTime())) {
    return { valid: false, error: 'timestamp invalido' };
  }
  if (ts.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    return { valid: false, error: 'timestamp no futuro' };
  }
  if (p.sequence !== undefined && !Number.isInteger(p.sequence)) {
    return { valid: false, error: 'sequence deve ser inteiro' };
  }

  return { valid: true, reading: p as unknown as WaterConsumptionReading };
}
