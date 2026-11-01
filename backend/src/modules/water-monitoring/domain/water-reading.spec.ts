import { WaterReading } from './water-reading';

describe('WaterReading (dominio)', () => {
  const base = {
    sensorId: 'sensor-abc-123',
    unitId: 'data-center-sp-01',
    timestamp: new Date('2026-11-01T22:05:30.000Z'),
    valueInLiters: 1234.56,
    readingType: 'sensor' as const,
  };

  it('cria leitura valida', () => {
    const reading = WaterReading.create(base);
    expect(reading.unitId).toBe('data-center-sp-01');
    expect(reading.valueInLiters).toBe(1234.56);
  });

  it('rejeita valor negativo', () => {
    expect(() => WaterReading.create({ ...base, valueInLiters: -1 })).toThrow(
      'valueInLiters deve ser um numero nao negativo',
    );
  });

  it('rejeita unitId vazio', () => {
    expect(() => WaterReading.create({ ...base, unitId: '  ' })).toThrow(
      'unitId e obrigatorio',
    );
  });
});
