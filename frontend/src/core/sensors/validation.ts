import { MANUAL_READING_MAX_AGE_DAYS } from '@ciclo-azul/contracts';

/**
 * Validacoes de formulario do R04 (core/ — agnostico de UI).
 *
 * Servem para dar feedback imediato e usam as MESMAS mensagens do backend. A
 * validacao que vale e a do servidor (borda da API); aqui so evitamos uma ida e
 * volta desnecessaria. Ver backend: water-monitoring/domain/{sensor,manual-reading}.ts.
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export const UNIT_REQUIRED_MESSAGE = 'A unidade é obrigatória';
export const SENSOR_ID_REQUIRED_MESSAGE = 'Informe o identificador do sensor';
export const MANUAL_VOLUME_MESSAGE = 'O volume da leitura deve ser maior que zero';
export const MANUAL_DATE_MESSAGE = `A data da leitura deve estar entre hoje e os últimos ${MANUAL_READING_MAX_AGE_DAYS} dias`;

export function unitHasSensorMessage(unitId: string): string {
  return `A unidade ${unitId} possui sensor conectado: leitura manual não é permitida`;
}

/**
 * Vinculo de sensor: campos obrigatorios. O formato do identificador (3 a 64
 * caracteres) e validado so no backend, que devolve a mensagem exata.
 */
export function validateLinkSensor(input: {
  sensorId: string;
  unitId: string;
}): FieldErrors<'sensorId' | 'unitId'> {
  const errors: FieldErrors<'sensorId' | 'unitId'> = {};
  if (!input.sensorId.trim()) {
    errors.sensorId = SENSOR_ID_REQUIRED_MESSAGE;
  }
  if (!input.unitId.trim()) {
    errors.unitId = UNIT_REQUIRED_MESSAGE;
  }
  return errors;
}

/**
 * Leitura manual: unidade informada e sem sensor conectado, volume > 0 e data
 * entre hoje e os ultimos 28 dias (contados do inicio do dia UTC atual).
 */
export function validateManualReading(
  input: { unitId: string; volume: number; date: string },
  context: { now: Date; connectedUnitIds: readonly string[] },
): FieldErrors<'unitId' | 'volume' | 'date'> {
  const errors: FieldErrors<'unitId' | 'volume' | 'date'> = {};
  const unitId = input.unitId.trim();

  if (!unitId) {
    errors.unitId = UNIT_REQUIRED_MESSAGE;
  } else if (context.connectedUnitIds.includes(unitId)) {
    errors.unitId = unitHasSensorMessage(unitId);
  }

  if (!Number.isFinite(input.volume) || input.volume <= 0) {
    errors.volume = MANUAL_VOLUME_MESSAGE;
  }

  const parsed = input.date.trim() ? new Date(input.date) : null;
  const earliest = startOfUtcDay(context.now) - MANUAL_READING_MAX_AGE_DAYS * DAY_MS;
  if (
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getTime() > context.now.getTime() ||
    parsed.getTime() < earliest
  ) {
    errors.date = MANUAL_DATE_MESSAGE;
  }

  return errors;
}

/** Data local no formato de <input type="date"> (AAAA-MM-DD). */
export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Menor data aceita para uma leitura manual, no formato de <input type="date">. */
export function earliestManualReadingDate(now: Date): string {
  return new Date(startOfUtcDay(now) - MANUAL_READING_MAX_AGE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
