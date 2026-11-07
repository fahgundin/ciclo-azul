import type { FieldErrors } from '../forms';

/**
 * Lotes de residuo GERADOS e ainda sem destinacao (R08) — core/, agnostico de UI.
 *
 * ADAPTER EM MEMORIA: o backend so conhece lotes JA destinados (registrar a
 * destinacao cria o lote). Nao existe lote pendente nem prazo no servidor (R08, #15,
 * em aberto). Os lotes pendentes ficam em `InMemoryPendingLotStore`, valem so ate
 * recarregar a pagina e existem apenas neste navegador. Ao registrar a destinacao
 * (POST /waste-lots, real), o lote pendente e removido. Ver docs/migracao-frontend.md.
 */

/**
 * PENDENCIA: o "prazo definido" para destinar ainda nao tem valor oficial
 * (docs/escopo.md). 30 dias e um valor ficticio de demonstracao, editavel por lote.
 */
export const DEFAULT_DISPOSAL_DEADLINE_DAYS = 30;

export interface PendingLot {
  id: string;
  wasteTypeId: string;
  quantity: number;
  /** ISO 8601 do momento em que o lote foi gerado. */
  generatedAt: string;
  /** Dias, a partir da geracao, para registrar a destinacao. */
  deadlineDays: number;
}

export interface NewPendingLot {
  wasteTypeId: string;
  quantity: number;
  deadlineDays: number;
}

/** Porta de armazenamento dos lotes pendentes (hoje em memoria; amanha, a API). */
export interface PendingLotStore {
  list(): PendingLot[];
  add(input: NewPendingLot, now: Date): PendingLot;
  remove(id: string): void;
}

/** ADAPTER EM MEMORIA dos lotes pendentes (perde tudo ao recarregar). */
export class InMemoryPendingLotStore implements PendingLotStore {
  private lots: PendingLot[] = [];
  private counter = 0;

  list(): PendingLot[] {
    return this.lots.map((lot) => ({ ...lot }));
  }

  add(input: NewPendingLot, now: Date): PendingLot {
    this.counter += 1;
    const lot: PendingLot = {
      id: `P-${String(this.counter).padStart(4, '0')}`,
      wasteTypeId: input.wasteTypeId,
      quantity: input.quantity,
      generatedAt: now.toISOString(),
      deadlineDays: input.deadlineDays,
    };
    this.lots = [lot, ...this.lots];
    return { ...lot };
  }

  remove(id: string): void {
    this.lots = this.lots.filter((lot) => lot.id !== id);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Limite para registrar a destinacao: geracao + prazo. */
export function lotDueDate(lot: Pick<PendingLot, 'generatedAt' | 'deadlineDays'>): Date {
  return new Date(Date.parse(lot.generatedAt) + lot.deadlineDays * DAY_MS);
}

/** O prazo expirou? So depois do limite (exatamente no limite ainda esta no prazo). */
export function isOverdue(
  lot: Pick<PendingLot, 'generatedAt' | 'deadlineDays'>,
  now: Date,
): boolean {
  return now.getTime() > lotDueDate(lot).getTime();
}

export type PendingLotField = 'wasteTypeId' | 'quantity' | 'deadlineDays';

export function validatePendingLot(values: NewPendingLot): FieldErrors<PendingLotField> {
  const errors: FieldErrors<PendingLotField> = {};
  if (!values.wasteTypeId.trim()) {
    errors.wasteTypeId = 'O tipo de resíduo é obrigatório';
  }
  if (!Number.isFinite(values.quantity) || values.quantity <= 0) {
    errors.quantity = 'A quantidade deve ser maior que zero';
  }
  if (!Number.isInteger(values.deadlineDays) || values.deadlineDays <= 0) {
    errors.deadlineDays = 'O prazo deve ser um número inteiro de dias maior que zero';
  }
  return errors;
}
