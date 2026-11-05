import {
  ManualReadingDateError,
  ManualReadingValueError,
  requirePositiveVolume,
  requireReadingDate,
  requireUnit,
} from './manual-reading';
import { UnitRequiredError } from './sensor';

// "Agora" fixo: 5 de novembro de 2026, 15:00 UTC.
const NOW = new Date('2026-11-05T15:00:00.000Z');

describe('requirePositiveVolume', () => {
  it('aceita volume maior que zero', () => {
    expect(requirePositiveVolume(1250.5)).toBe(1250.5);
  });

  it.each([
    ['zero', 0],
    ['negativo', -10],
    ['NaN', Number.NaN],
    ['infinito', Number.POSITIVE_INFINITY],
    ['texto', '100'],
    ['nulo', null],
    ['indefinido', undefined],
  ])('rejeita volume invalido: %s', (_label, value) => {
    expect(() => requirePositiveVolume(value)).toThrow(ManualReadingValueError);
  });
});

describe('requireReadingDate (janela de 28 dias)', () => {
  it('aceita a data de hoje (so a data)', () => {
    expect(requireReadingDate('2026-11-05', NOW).toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });

  it('aceita hoje com hora ate o instante atual', () => {
    expect(() => requireReadingDate('2026-11-05T14:59:00.000Z', NOW)).not.toThrow();
  });

  it('aceita exatamente 28 dias atras', () => {
    expect(() => requireReadingDate('2026-10-08', NOW)).not.toThrow();
  });

  it('rejeita 29 dias atras', () => {
    expect(() => requireReadingDate('2026-10-07', NOW)).toThrow(ManualReadingDateError);
  });

  it('rejeita data no futuro (amanha)', () => {
    expect(() => requireReadingDate('2026-11-06', NOW)).toThrow(ManualReadingDateError);
  });

  it('rejeita hoje com hora posterior ao instante atual', () => {
    expect(() => requireReadingDate('2026-11-05T16:00:00.000Z', NOW)).toThrow(
      ManualReadingDateError,
    );
  });

  it.each([
    ['texto nao-data', 'ontem'],
    ['vazio', ''],
    ['so espacos', '   '],
    ['numero', 20261105],
    ['nulo', null],
    ['indefinido', undefined],
  ])('rejeita data invalida: %s', (_label, value) => {
    expect(() => requireReadingDate(value, NOW)).toThrow(ManualReadingDateError);
  });
});

describe('requireUnit', () => {
  it('aceita e normaliza a unidade', () => {
    expect(requireUnit('  data-center-sp-01 ')).toBe('data-center-sp-01');
  });

  it.each([[''], ['   '], [undefined], [null], [42]])('rejeita unidade invalida: %p', (value) => {
    expect(() => requireUnit(value)).toThrow(UnitRequiredError);
  });
});
