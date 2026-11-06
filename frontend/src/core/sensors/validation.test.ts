import { describe, it, expect } from 'vitest';
import {
  MANUAL_DATE_MESSAGE,
  MANUAL_VOLUME_MESSAGE,
  SENSOR_ID_REQUIRED_MESSAGE,
  UNIT_REQUIRED_MESSAGE,
  earliestManualReadingDate,
  toDateInputValue,
  unitHasSensorMessage,
  validateLinkSensor,
  validateManualReading,
} from './validation';

// 05/11/2026 15:00 UTC. A janela vai de 08/10/2026 (28 dias antes) ate esse instante.
const NOW = new Date('2026-11-05T15:00:00Z');
const ctx = { now: NOW, connectedUnitIds: ['dc-sp1'] };
const valid = { unitId: 'dc-for', volume: 96, date: '2026-11-05' };

describe('validateLinkSensor', () => {
  it('aceita identificador e unidade preenchidos', () => {
    expect(validateLinkSensor({ sensorId: 'sn-01', unitId: 'dc-sp1' })).toEqual({});
  });

  it('exige identificador e unidade (ignorando espacos)', () => {
    expect(validateLinkSensor({ sensorId: '  ', unitId: '' })).toEqual({
      sensorId: SENSOR_ID_REQUIRED_MESSAGE,
      unitId: UNIT_REQUIRED_MESSAGE,
    });
  });
});

describe('validateManualReading', () => {
  it('aceita uma leitura valida', () => {
    expect(validateManualReading(valid, ctx)).toEqual({});
  });

  it('exige a unidade', () => {
    expect(validateManualReading({ ...valid, unitId: '  ' }, ctx).unitId).toBe(
      UNIT_REQUIRED_MESSAGE,
    );
  });

  it('bloqueia unidade que ja tem sensor conectado', () => {
    expect(validateManualReading({ ...valid, unitId: ' dc-sp1 ' }, ctx).unitId).toBe(
      unitHasSensorMessage('dc-sp1'),
    );
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('rejeita o volume %s', (volume) => {
    expect(validateManualReading({ ...valid, volume }, ctx).volume).toBe(MANUAL_VOLUME_MESSAGE);
  });

  it('aceita volume decimal positivo', () => {
    expect(validateManualReading({ ...valid, volume: 0.5 }, ctx)).toEqual({});
  });

  it('aceita hoje e o limite de 28 dias atras', () => {
    expect(validateManualReading({ ...valid, date: '2026-11-05' }, ctx).date).toBeUndefined();
    expect(validateManualReading({ ...valid, date: '2026-10-08' }, ctx).date).toBeUndefined();
  });

  it('rejeita data mais antiga que 28 dias', () => {
    expect(validateManualReading({ ...valid, date: '2026-10-07' }, ctx).date).toBe(
      MANUAL_DATE_MESSAGE,
    );
  });

  it('rejeita data no futuro', () => {
    expect(validateManualReading({ ...valid, date: '2026-11-06' }, ctx).date).toBe(
      MANUAL_DATE_MESSAGE,
    );
  });

  it.each(['', '   ', 'ontem', '2026-13-40'])('rejeita data invalida (%j)', (date) => {
    expect(validateManualReading({ ...valid, date }, ctx).date).toBe(MANUAL_DATE_MESSAGE);
  });

  it('acumula varios erros de uma vez', () => {
    expect(
      Object.keys(validateManualReading({ unitId: '', volume: 0, date: '' }, ctx)).sort(),
    ).toEqual(['date', 'unitId', 'volume']);
  });
});

describe('datas do formulario', () => {
  it('toDateInputValue formata a data local como AAAA-MM-DD', () => {
    expect(toDateInputValue(new Date(2026, 10, 5, 12, 0))).toBe('2026-11-05');
    expect(toDateInputValue(new Date(2026, 0, 9, 8, 0))).toBe('2026-01-09');
  });

  it('earliestManualReadingDate e o inicio do dia UTC 28 dias atras', () => {
    expect(earliestManualReadingDate(NOW)).toBe('2026-10-08');
  });
});
