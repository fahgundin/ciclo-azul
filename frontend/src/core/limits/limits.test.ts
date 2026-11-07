import { describe, it, expect } from 'vitest';
import { InMemoryLimitStore, LIMIT_INVALID_MESSAGE, NO_LIMITS, validateLimits } from './limits';

describe('InMemoryLimitStore (adapter em memoria)', () => {
  it('comeca sem limites', () => {
    expect(new InMemoryLimitStore().get()).toEqual(NO_LIMITS);
  });

  it('guarda os limites salvos', () => {
    const store = new InMemoryLimitStore();
    store.save({ general: 30000, units: { 'dc-sp1': 10000 } });
    expect(store.get()).toEqual({ general: 30000, units: { 'dc-sp1': 10000 } });
  });

  it('nao compartilha referencia: mexer no que foi lido/salvo nao altera o armazenado', () => {
    const store = new InMemoryLimitStore();
    const input = { general: 1, units: { a: 2 } };
    store.save(input);
    input.units.a = 999;
    const read = store.get();
    read.units.a = 888;
    expect(store.get().units.a).toBe(2);
  });

  it('cada instancia tem seu proprio estado', () => {
    const a = new InMemoryLimitStore();
    a.save({ general: 5, units: {} });
    expect(new InMemoryLimitStore().get().general).toBeNull();
  });
});

describe('validateLimits', () => {
  it('aceita limites validos (inclusive virgula decimal)', () => {
    const { errors, limits } = validateLimits({
      general: '30000',
      units: { 'dc-sp1': '10000', 'dc-cps': '2500,5' },
    });
    expect(errors).toEqual({});
    expect(limits).toEqual({ general: 30000, units: { 'dc-sp1': 10000, 'dc-cps': 2500.5 } });
  });

  it('campo vazio significa sem limite', () => {
    const { limits } = validateLimits({ general: '  ', units: { 'dc-sp1': '', 'dc-cps': '100' } });
    expect(limits).toEqual({ general: null, units: { 'dc-cps': 100 } });
  });

  it.each(['0', '-5', 'abc', '1e999', 'NaN'])('rejeita %j', (text) => {
    const { errors, limits } = validateLimits({ general: text, units: {} });
    expect(errors.general).toBe(LIMIT_INVALID_MESSAGE);
    expect(limits).toBeNull();
  });

  it('indica o campo da unidade com erro', () => {
    const { errors, limits } = validateLimits({
      general: '10',
      units: { 'dc-sp1': '0', 'dc-cps': '5' },
    });
    expect(errors).toEqual({ 'unit:dc-sp1': LIMIT_INVALID_MESSAGE });
    expect(limits).toBeNull();
  });
});
