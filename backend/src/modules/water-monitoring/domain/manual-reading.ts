import { MANUAL_READING_MAX_AGE_DAYS } from '@ciclo-azul/contracts';
import { UnitRequiredError } from './sensor';

/** Erro de dominio: volume da leitura manual invalido. */
export class ManualReadingValueError extends Error {
  constructor() {
    super('O volume da leitura deve ser maior que zero');
    this.name = 'ManualReadingValueError';
  }
}

/** Erro de dominio: data da leitura manual fora da janela permitida. */
export class ManualReadingDateError extends Error {
  constructor() {
    super(
      `A data da leitura deve estar entre hoje e os últimos ${MANUAL_READING_MAX_AGE_DAYS} dias`,
    );
    this.name = 'ManualReadingDateError';
  }
}

/** Erro de dominio: a unidade ja tem sensor conectado. */
export class UnitHasSensorError extends Error {
  constructor(unitId: string) {
    super(`A unidade ${unitId} possui sensor conectado: leitura manual não é permitida`);
    this.name = 'UnitHasSensorError';
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Valida e normaliza a unidade da leitura manual. */
export function requireUnit(unitId: unknown): string {
  const value = typeof unitId === 'string' ? unitId.trim() : '';
  if (!value) {
    throw new UnitRequiredError();
  }
  return value;
}

/** O volume deve ser um numero finito maior que zero. */
export function requirePositiveVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ManualReadingValueError();
  }
  return value;
}

/**
 * A data deve ser valida, nao estar no futuro e nao ser mais antiga que
 * MANUAL_READING_MAX_AGE_DAYS dias (contados a partir do inicio do dia atual, UTC).
 * Aceita so a data (2026-11-05) ou data e hora. Funcao PURA — `now` e injetado.
 */
export function requireReadingDate(value: unknown, now: Date): Date {
  const date = typeof value === 'string' && value.trim() ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new ManualReadingDateError();
  }
  const earliest = startOfUtcDay(now) - MANUAL_READING_MAX_AGE_DAYS * DAY_MS;
  if (date.getTime() > now.getTime() || date.getTime() < earliest) {
    throw new ManualReadingDateError();
  }
  return date;
}
