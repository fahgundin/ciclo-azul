import { ReadingDeduplicator } from './reading-deduplicator';
import type { WaterConsumptionReading } from '@ciclo-azul/contracts';

function reading(overrides: Partial<WaterConsumptionReading> = {}): WaterConsumptionReading {
  return {
    schemaVersion: '1.0',
    sensorId: 'sensor-abc-123',
    unitId: 'data-center-sp-01',
    timestamp: '2026-11-01T22:05:30.000Z',
    metric: 'water-consumption',
    value: 100,
    unit: 'liter',
    readingType: 'sensor',
    sequence: 1,
    ...overrides,
  };
}

describe('ReadingDeduplicator', () => {
  it('considera nova a primeira ocorrencia e duplicata a repeticao (por sequence)', () => {
    const dedup = new ReadingDeduplicator();
    expect(dedup.isNew(reading({ sequence: 1 }))).toBe(true);
    expect(dedup.isNew(reading({ sequence: 1 }))).toBe(false);
    expect(dedup.isNew(reading({ sequence: 2 }))).toBe(true);
  });

  it('distingue por sensorId mesmo com a mesma sequence', () => {
    const dedup = new ReadingDeduplicator();
    expect(dedup.isNew(reading({ sensorId: 's1', sequence: 1 }))).toBe(true);
    expect(dedup.isNew(reading({ sensorId: 's2', sequence: 1 }))).toBe(true);
  });

  it('usa timestamp quando nao ha sequence', () => {
    const dedup = new ReadingDeduplicator();
    const { sequence, ...base } = reading();
    void sequence;
    expect(dedup.isNew(base as WaterConsumptionReading)).toBe(true);
    expect(dedup.isNew(base as WaterConsumptionReading)).toBe(false);
  });

  it('respeita o limite de chaves (evicta a mais antiga)', () => {
    const dedup = new ReadingDeduplicator(2);
    expect(dedup.isNew(reading({ sequence: 1 }))).toBe(true);
    expect(dedup.isNew(reading({ sequence: 2 }))).toBe(true);
    expect(dedup.isNew(reading({ sequence: 3 }))).toBe(true); // evicta seq:1
    expect(dedup.isNew(reading({ sequence: 1 }))).toBe(true); // seq:1 saiu da janela
  });
});
