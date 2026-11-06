import { computeConsumptionStatus } from './consumption-status';
import { WaterReading } from './water-reading';

// "Agora" fixo: 5 de novembro de 2026, 15:00:00 UTC.
const NOW = new Date('2026-11-05T15:00:00.000Z');

/** Leitura com `minutesAgo` minutos (e `extraSeconds` segundos) antes de NOW. */
function readingAgo(minutesAgo: number, extraSeconds = 0, valueInLiters = 1234.5): WaterReading {
  return WaterReading.create({
    sensorId: 'sensor-abc-123',
    unitId: 'data-center-sp-01',
    timestamp: new Date(NOW.getTime() - minutesAgo * 60_000 - extraSeconds * 1000),
    valueInLiters,
    readingType: 'sensor',
  });
}

describe('computeConsumptionStatus (regra dos 15 minutos — R05)', () => {
  it('unidade sem nenhuma leitura fica em no-data', () => {
    expect(computeConsumptionStatus('u1', null, NOW)).toEqual({
      unitId: 'u1',
      state: 'no-data',
      currentValueInLiters: null,
      lastReadingAt: null,
      lastReadingType: null,
    });
  });

  it('leitura de agora: live, com o consumo atual', () => {
    const status = computeConsumptionStatus('data-center-sp-01', readingAgo(0), NOW);
    expect(status.state).toBe('live');
    expect(status.currentValueInLiters).toBe(1234.5);
    expect(status.lastReadingAt).toEqual(NOW);
    expect(status.lastReadingType).toBe('sensor');
  });

  it('leitura de 14 min 59 s atras ainda e live', () => {
    expect(computeConsumptionStatus('u', readingAgo(14, 59), NOW).state).toBe('live');
  });

  it('exatamente 15 minutos atras ainda e live (o criterio e "mais de 15")', () => {
    expect(computeConsumptionStatus('u', readingAgo(15), NOW).state).toBe('live');
  });

  it('15 min e 1 s atras ja e stale ("Sem dados recentes")', () => {
    expect(computeConsumptionStatus('u', readingAgo(15, 1), NOW).state).toBe('stale');
  });

  it('stale mantem o ultimo valor conhecido e o horario da ultima leitura', () => {
    const status = computeConsumptionStatus('u', readingAgo(40, 0, 777), NOW);
    expect(status.state).toBe('stale');
    expect(status.currentValueInLiters).toBe(777);
    expect(status.lastReadingAt).toEqual(new Date(NOW.getTime() - 40 * 60_000));
  });

  it('leitura levemente no futuro (relogio do sensor adiantado) conta como recente', () => {
    expect(computeConsumptionStatus('u', readingAgo(-1), NOW).state).toBe('live');
  });

  it('respeita um limite diferente quando informado', () => {
    expect(computeConsumptionStatus('u', readingAgo(6), NOW, 5).state).toBe('stale');
    expect(computeConsumptionStatus('u', readingAgo(4), NOW, 5).state).toBe('live');
  });
});
