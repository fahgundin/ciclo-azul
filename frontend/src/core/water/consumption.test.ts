import { describe, it, expect } from 'vitest';
import type { ReadingEvent, UnitConsumptionStatus } from '@ciclo-azul/contracts';
import {
  applyReadingEvent,
  deriveState,
  mergeChartPoints,
  refreshStates,
  toChartPoints,
} from './consumption';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const minutesAgo = (m: number, s = 0) =>
  new Date(NOW.getTime() - m * 60_000 - s * 1000).toISOString();

const status = (
  unitId: string,
  lastReadingAt: string | null,
  value = 10,
): UnitConsumptionStatus => ({
  unitId,
  state: lastReadingAt ? 'live' : 'no-data',
  currentValueInLiters: lastReadingAt ? value : null,
  lastReadingAt,
  lastReadingType: lastReadingAt ? 'sensor' : null,
  staleAfterMinutes: 15,
});

const event = (unitId: string, timestamp: string, valueInLiters: number): ReadingEvent => ({
  unitId,
  sensorId: 'sn-1',
  timestamp,
  valueInLiters,
  readingType: 'sensor',
});

describe('deriveState (regra dos 15 minutos)', () => {
  it('sem leitura = no-data', () => {
    expect(deriveState(null, 15, NOW)).toBe('no-data');
  });

  it('leitura recente = live', () => {
    expect(deriveState(minutesAgo(2), 15, NOW)).toBe('live');
  });

  it('exatamente 15 minutos ainda e recente', () => {
    expect(deriveState(minutesAgo(15), 15, NOW)).toBe('live');
  });

  it('15 minutos e 1 segundo ja e "Sem dados recentes"', () => {
    expect(deriveState(minutesAgo(15, 1), 15, NOW)).toBe('stale');
  });

  it('leitura levemente no futuro (relogio do sensor adiantado) conta como recente', () => {
    expect(deriveState(new Date(NOW.getTime() + 30_000).toISOString(), 15, NOW)).toBe('live');
  });

  it('respeita um limite diferente informado pelo backend', () => {
    expect(deriveState(minutesAgo(6), 5, NOW)).toBe('stale');
  });
});

describe('refreshStates', () => {
  it('uma unidade live vira stale com o passar do tempo, sem leitura nova', () => {
    const before = [status('dc-sp1', minutesAgo(10))];
    const later = new Date(NOW.getTime() + 10 * 60_000);
    expect(refreshStates(before, NOW)[0]?.state).toBe('live');
    expect(refreshStates(before, later)[0]?.state).toBe('stale');
  });

  it('nao altera os demais campos nem muta a lista original', () => {
    const original = [status('dc-sp1', minutesAgo(30), 42)];
    const [refreshed] = refreshStates(original, NOW);
    expect(refreshed).toMatchObject({ unitId: 'dc-sp1', currentValueInLiters: 42, state: 'stale' });
    expect(original[0]?.state).toBe('live');
  });
});

describe('applyReadingEvent', () => {
  it('atualiza consumo atual, instante e origem, e volta a "live"', () => {
    const list = [status('dc-rj2', minutesAgo(40), 5)];
    const [updated] = applyReadingEvent(list, event('dc-rj2', minutesAgo(0, 5), 77), NOW);
    expect(updated).toMatchObject({
      unitId: 'dc-rj2',
      state: 'live',
      currentValueInLiters: 77,
      lastReadingAt: minutesAgo(0, 5),
      lastReadingType: 'sensor',
    });
  });

  it('unidade sem leitura previa sai de no-data', () => {
    const [updated] = applyReadingEvent(
      [status('dc-sp1', null)],
      event('dc-sp1', minutesAgo(1), 9),
      NOW,
    );
    expect(updated?.state).toBe('live');
    expect(updated?.currentValueInLiters).toBe(9);
  });

  it('leitura mais antiga que a atual nao a substitui', () => {
    const list = [status('dc-sp1', minutesAgo(1), 50)];
    const result = applyReadingEvent(list, event('dc-sp1', minutesAgo(5), 1), NOW);
    expect(result[0]?.currentValueInLiters).toBe(50);
    expect(result[0]?.lastReadingAt).toBe(minutesAgo(1));
  });

  it('leitura antiga recebida agora nao deixa a unidade "live" se passou do limite', () => {
    const [updated] = applyReadingEvent(
      [status('dc-sp1', null)],
      event('dc-sp1', minutesAgo(20), 3),
      NOW,
    );
    expect(updated?.state).toBe('stale');
  });

  it('unidade desconhecida entra na lista, em ordem alfabetica, com o limite padrao', () => {
    const list = [status('dc-sp1', minutesAgo(1)), status('dc-sp3', minutesAgo(1))];
    const result = applyReadingEvent(list, event('dc-sp2', minutesAgo(0), 4), NOW);
    expect(result.map((s) => s.unitId)).toEqual(['dc-sp1', 'dc-sp2', 'dc-sp3']);
    expect(result[1]?.staleAfterMinutes).toBe(15);
  });

  it('nao muta a lista original', () => {
    const list = [status('dc-sp1', minutesAgo(10), 1)];
    applyReadingEvent(list, event('dc-sp1', minutesAgo(0), 2), NOW);
    expect(list[0]?.currentValueInLiters).toBe(1);
  });
});

describe('toChartPoints / mergeChartPoints', () => {
  const r = (minutes: number, v: number) => ({ timestamp: minutesAgo(minutes), valueInLiters: v });

  it('ordena do mais antigo ao mais novo e mantem so os ultimos N', () => {
    const points = toChartPoints([r(1, 3), r(5, 1), r(3, 2)], 2);
    expect(points.map((p) => p.v)).toEqual([2, 3]);
  });

  it('ignora instantes invalidos', () => {
    expect(toChartPoints([{ timestamp: 'ontem', valueInLiters: 1 }])).toEqual([]);
  });

  it('merge nao repete a mesma leitura e ordena', () => {
    const history = toChartPoints([r(5, 1), r(3, 2)]);
    const live = toChartPoints([r(3, 2), r(1, 9)]);
    expect(mergeChartPoints(history, live).map((p) => p.v)).toEqual([1, 2, 9]);
  });

  it('merge respeita o limite de pontos', () => {
    const history = toChartPoints([r(5, 1), r(4, 2), r(3, 3)]);
    expect(mergeChartPoints(history, [], 2).map((p) => p.v)).toEqual([2, 3]);
  });
});
