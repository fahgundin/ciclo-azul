import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DISPOSAL_DEADLINE_DAYS,
  InMemoryPendingLotStore,
  isOverdue,
  lotDueDate,
  validatePendingLot,
} from './pending-lot';

const T0 = new Date('2026-11-01T12:00:00.000Z');
const lot = { generatedAt: T0.toISOString(), deadlineDays: 30 };

describe('InMemoryPendingLotStore (adapter em memoria)', () => {
  it('adiciona lotes com id sequencial, o mais novo primeiro', () => {
    const store = new InMemoryPendingLotStore();
    const a = store.add({ wasteTypeId: 'wt-1', quantity: 100, deadlineDays: 30 }, T0);
    const b = store.add({ wasteTypeId: 'wt-2', quantity: 5, deadlineDays: 10 }, T0);
    expect(a.id).toBe('P-0001');
    expect(b.id).toBe('P-0002');
    expect(store.list().map((l) => l.id)).toEqual(['P-0002', 'P-0001']);
    expect(a.generatedAt).toBe(T0.toISOString());
  });

  it('remove um lote (ex.: depois de registrar a destinacao)', () => {
    const store = new InMemoryPendingLotStore();
    const a = store.add({ wasteTypeId: 'wt-1', quantity: 1, deadlineDays: 1 }, T0);
    store.remove(a.id);
    expect(store.list()).toEqual([]);
  });

  it('ids nao se repetem depois de remover', () => {
    const store = new InMemoryPendingLotStore();
    const a = store.add({ wasteTypeId: 'wt-1', quantity: 1, deadlineDays: 1 }, T0);
    store.remove(a.id);
    expect(store.add({ wasteTypeId: 'wt-1', quantity: 1, deadlineDays: 1 }, T0).id).toBe('P-0002');
  });

  it('nao compartilha referencia com quem leu', () => {
    const store = new InMemoryPendingLotStore();
    store.add({ wasteTypeId: 'wt-1', quantity: 1, deadlineDays: 1 }, T0);
    store.list()[0]!.quantity = 999;
    expect(store.list()[0]?.quantity).toBe(1);
  });
});

describe('prazo do lote (R08)', () => {
  it('o limite e a geracao mais o prazo', () => {
    expect(lotDueDate(lot).toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });

  it('dentro do prazo nao esta vencido', () => {
    expect(isOverdue(lot, new Date('2026-11-20T00:00:00.000Z'))).toBe(false);
  });

  it('exatamente no limite ainda esta no prazo; um segundo depois vence', () => {
    expect(isOverdue(lot, new Date('2026-12-01T12:00:00.000Z'))).toBe(false);
    expect(isOverdue(lot, new Date('2026-12-01T12:00:01.000Z'))).toBe(true);
  });

  it('o prazo padrao e ficticio e fica em 30 dias', () => {
    expect(DEFAULT_DISPOSAL_DEADLINE_DAYS).toBe(30);
  });
});

describe('validatePendingLot', () => {
  it('aceita um lote valido', () => {
    expect(validatePendingLot({ wasteTypeId: 'wt-1', quantity: 10, deadlineDays: 30 })).toEqual({});
  });

  it('exige tipo, quantidade positiva e prazo inteiro positivo', () => {
    expect(validatePendingLot({ wasteTypeId: ' ', quantity: 0, deadlineDays: 0 })).toEqual({
      wasteTypeId: 'O tipo de resíduo é obrigatório',
      quantity: 'A quantidade deve ser maior que zero',
      deadlineDays: 'O prazo deve ser um número inteiro de dias maior que zero',
    });
  });

  it.each([Number.NaN, 2.5, -3])('rejeita prazo %s', (deadlineDays) => {
    expect(
      validatePendingLot({ wasteTypeId: 'wt-1', quantity: 1, deadlineDays }).deadlineDays,
    ).toBeDefined();
  });

  it('rejeita quantidade nao finita', () => {
    expect(
      validatePendingLot({ wasteTypeId: 'wt-1', quantity: Number.NaN, deadlineDays: 1 }).quantity,
    ).toBeDefined();
  });
});
