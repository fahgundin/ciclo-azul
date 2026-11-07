import { describe, it, expect } from 'vitest';
import {
  HISTORY_WINDOW_DAYS,
  InMemoryAppliedStore,
  MIN_HISTORY_HOURS,
  analyzeReuse,
  sumSavings,
  type UnitHistory,
} from './opportunities';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (msAgo: number, v: number) => ({ t: NOW.getTime() - msAgo, v });

/** `days` dias de historico com `perDay` litros por dia, em 1 leitura por dia. */
function unit(unitId: string, days: number, perDay: number): UnitHistory {
  return {
    unitId,
    readings: Array.from({ length: days }, (_, i) => at((days - i) * DAY, perDay)),
  };
}

describe('analyzeReuse — historico suficiente (HU05, cenario 1)', () => {
  it('apresenta ao menos uma recomendacao com estimativa de economia', () => {
    const { opportunities, insufficient } = analyzeReuse([unit('dc-sp1', 10, 10000)], NOW);
    expect(insufficient).toEqual([]);
    expect(opportunities.length).toBeGreaterThanOrEqual(1);
    expect(opportunities.every((o) => o.monthlySavingLiters > 0)).toBe(true);
  });

  it('estima a economia como percentual do consumo mensal (10.000 L/dia x 30 = 300.000 L/mes)', () => {
    const { opportunities } = analyzeReuse([unit('dc-sp1', 10, 10000)], NOW);
    const byKey = (key: string) => opportunities.find((o) => o.id === `${key}-dc-sp1`);
    expect(byKey('purge')?.monthlySavingLiters).toBe(18000); // 6%
    expect(byKey('cycles')?.monthlySavingLiters).toBe(24000); // 8%
    expect(byKey('rain')?.monthlySavingLiters).toBe(15000); // 5%
  });

  it('ordena da maior para a menor economia', () => {
    const { opportunities } = analyzeReuse([unit('dc-sp1', 10, 10000)], NOW);
    expect(opportunities.map((o) => o.monthlySavingLiters)).toEqual([24000, 18000, 15000]);
  });

  it('o aumento de ciclos so e indicado para a unidade de maior consumo', () => {
    const { opportunities } = analyzeReuse(
      [unit('dc-cps', 10, 5000), unit('dc-sp1', 10, 20000)],
      NOW,
    );
    const cycles = opportunities.filter((o) => o.id.startsWith('cycles-'));
    expect(cycles.map((o) => o.unitId)).toEqual(['dc-sp1']);
    expect(
      opportunities
        .filter((o) => o.id.startsWith('purge-'))
        .map((o) => o.unitId)
        .sort(),
    ).toEqual(['dc-cps', 'dc-sp1']);
  });

  it('a evidencia cita o consumo medido e que o percentual e de demonstracao', () => {
    const { opportunities } = analyzeReuse([unit('dc-sp1', 10, 10000)], NOW);
    const evidence = opportunities.find((o) => o.id === 'purge-dc-sp1')!.evidence;
    expect(evidence).toContain('Consumo medido em 10 dia(s): 100.000 L em 10 leituras');
    expect(evidence).toContain('6% do consumo mensal (referência de demonstração)');
  });

  it('usa so os ultimos 30 dias: leituras mais antigas e do futuro ficam de fora', () => {
    const history: UnitHistory = {
      unitId: 'dc-sp1',
      readings: [
        at(HISTORY_WINDOW_DAYS * DAY + 1000, 999999), // fora da janela
        at(-HOUR, 999999), // futuro
        ...unit('dc-sp1', 10, 10000).readings,
      ],
    };
    const { opportunities } = analyzeReuse([history], NOW);
    expect(opportunities.find((o) => o.id === 'purge-dc-sp1')?.monthlySavingLiters).toBe(18000);
  });
});

describe('analyzeReuse — historico insuficiente (HU05, cenario 2)', () => {
  it('unidade cadastrada ha menos de um dia nao recebe recomendacoes', () => {
    const young: UnitHistory = {
      unitId: 'dc-rs5',
      readings: [at(10 * HOUR, 100), at(1 * HOUR, 120)],
    };
    const { opportunities, insufficient } = analyzeReuse([young], NOW);
    expect(opportunities).toEqual([]);
    expect(insufficient).toEqual(['dc-rs5']);
  });

  it('exatamente 24 horas de historico ja basta; um instante menos, nao', () => {
    const ok: UnitHistory = {
      unitId: 'a',
      readings: [at(MIN_HISTORY_HOURS * HOUR, 100), at(HOUR, 100)],
    };
    const short: UnitHistory = {
      unitId: 'b',
      readings: [at(MIN_HISTORY_HOURS * HOUR - 1000, 100), at(HOUR, 100)],
    };
    expect(analyzeReuse([ok], NOW).insufficient).toEqual([]);
    expect(analyzeReuse([short], NOW).insufficient).toEqual(['b']);
  });

  it('uma unica leitura nao e historico, por mais antiga que seja', () => {
    expect(analyzeReuse([{ unitId: 'x', readings: [at(10 * DAY, 5)] }], NOW).insufficient).toEqual([
      'x',
    ]);
  });

  it('unidade sem leituras e unidade parada ha mais de 30 dias sao insuficientes', () => {
    const stopped: UnitHistory = { unitId: 'parada', readings: [at(40 * DAY, 1), at(35 * DAY, 1)] };
    const { insufficient } = analyzeReuse([{ unitId: 'vazia', readings: [] }, stopped], NOW);
    expect(insufficient).toEqual(['parada', 'vazia']);
  });

  it('mistura: recomenda para quem tem historico e lista as demais', () => {
    const { opportunities, insufficient } = analyzeReuse(
      [unit('dc-sp1', 10, 1000), { unitId: 'dc-rs5', readings: [at(HOUR, 1)] }],
      NOW,
    );
    expect(opportunities.every((o) => o.unitId === 'dc-sp1')).toBe(true);
    expect(insufficient).toEqual(['dc-rs5']);
  });
});

describe('InMemoryAppliedStore / sumSavings', () => {
  it('marca oportunidades como aplicadas, so nesta instancia', () => {
    const store = new InMemoryAppliedStore();
    expect(store.has('purge-dc-sp1')).toBe(false);
    store.apply('purge-dc-sp1');
    expect(store.has('purge-dc-sp1')).toBe(true);
    expect(new InMemoryAppliedStore().has('purge-dc-sp1')).toBe(false);
  });

  it('soma as economias', () => {
    const { opportunities } = analyzeReuse([unit('dc-sp1', 10, 10000)], NOW);
    expect(sumSavings(opportunities)).toBe(57000);
    expect(sumSavings([])).toBe(0);
  });
});
