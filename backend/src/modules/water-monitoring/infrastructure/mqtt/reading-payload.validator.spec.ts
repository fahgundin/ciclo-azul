import { validateReadingPayload } from './reading-payload.validator';

const now = new Date('2026-11-01T22:10:00.000Z');

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0',
    sensorId: 'sensor-abc-123',
    unitId: 'data-center-sp-01',
    timestamp: '2026-11-01T22:05:30.000Z',
    metric: 'water-consumption',
    value: 1234.56,
    unit: 'liter',
    readingType: 'sensor',
    sequence: 10,
    ...overrides,
  };
}

describe('validateReadingPayload', () => {
  it('aceita um payload valido', () => {
    const result = validateReadingPayload(validPayload(), now);
    expect(result.valid).toBe(true);
  });

  it('aceita payload sem sequence (campo opcional)', () => {
    const { sequence, ...rest } = validPayload();
    void sequence;
    const result = validateReadingPayload(rest, now);
    expect(result.valid).toBe(true);
  });

  it.each([
    ['nao-objeto', 'payload nao e um objeto', 'abc'],
    ['schemaVersion ausente', 'schemaVersion ausente', validPayload({ schemaVersion: '' })],
    ['sensorId ausente', 'sensorId ausente', validPayload({ sensorId: '' })],
    ['unitId ausente', 'unitId ausente', validPayload({ unitId: '  ' })],
    ['metric invalida', 'metric invalida', validPayload({ metric: 'energia' })],
    ['unit invalida', 'unit invalida', validPayload({ unit: 'm3' })],
    ['readingType invalido', 'readingType invalido', validPayload({ readingType: 'x' })],
    ['value negativo', 'value deve ser numero nao negativo', validPayload({ value: -1 })],
    ['value nao numerico', 'value deve ser numero nao negativo', validPayload({ value: 'NaN' })],
    ['timestamp invalido', 'timestamp invalido', validPayload({ timestamp: 'ontem' })],
    ['sequence nao inteiro', 'sequence deve ser inteiro', validPayload({ sequence: 1.5 })],
  ])('rejeita: %s', (_label, expectedError, payload) => {
    const result = validateReadingPayload(payload, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe(expectedError);
    }
  });

  it('rejeita timestamp no futuro alem da tolerancia', () => {
    const result = validateReadingPayload(
      validPayload({ timestamp: '2026-11-01T23:00:00.000Z' }),
      now,
    );
    expect(result.valid).toBe(false);
  });

  it('aceita timestamp levemente no futuro dentro da tolerancia', () => {
    const result = validateReadingPayload(
      validPayload({ timestamp: '2026-11-01T22:11:00.000Z' }),
      now,
    );
    expect(result.valid).toBe(true);
  });
});
