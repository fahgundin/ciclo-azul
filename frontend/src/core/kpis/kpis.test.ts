import { describe, it, expect } from 'vitest';
import { analyzeReuse } from '../reuse/opportunities';
import type { PendingLot } from '../waste/pending-lot';
import { CHART_DAYS, dailySeries, reuseKpi, wasteKpi, waterKpi } from './kpis';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const DAY = 86_400_000;

describe('dailySeries', () => {
  it('devolve os ultimos 7 dias, do mais antigo a hoje, somando as leituras de cada dia (UTC)', () => {
    const points = [
      { t: NOW.getTime(), v: 100 }, // hoje
      { t: NOW.getTime() - 1 * DAY, v: 40 },
      { t: NOW.getTime() - 1 * DAY + 1000, v: 60 },
      { t: NOW.getTime() - 6 * DAY, v: 7 },
      { t: NOW.getTime() - 7 * DAY, v: 999 }, // fora da janela
    ];
    const series = dailySeries(points, NOW);
    expect(series).toHaveLength(CHART_DAYS);
    expect(series.map((d) => d.liters)).toEqual([7, 0, 0, 0, 0, 100, 100]);
    expect(series.map((d) => d.partial)).toEqual([false, false, false, false, false, false, true]);
    expect(series[6]?.dayStart).toBe(Date.UTC(2026, 10, 7));
    expect(series[0]?.dayStart).toBe(Date.UTC(2026, 10, 1));
  });

  it('sem leituras, todos os dias valem zero', () => {
    expect(dailySeries([], NOW).every((d) => d.liters === 0)).toBe(true);
  });
});

describe('waterKpi — consumo do dia frente ao limite', () => {
  it('abaixo de 80%: ok', () => {
    expect(waterKpi(500, 1000)).toEqual({
      todayLiters: 500,
      limitLiters: 1000,
      ratio: 0.5,
      level: 'ok',
    });
  });

  it('perto do limite a partir de 80%', () => {
    expect(waterKpi(800, 1000).level).toBe('warn');
  });

  it('exatamente no limite ainda e "perto"; so passando e excedido', () => {
    expect(waterKpi(1000, 1000).level).toBe('warn');
    expect(waterKpi(1001, 1000).level).toBe('crit');
  });

  it('sem limite definido nao ha razao nem nivel', () => {
    expect(waterKpi(500, null)).toEqual({
      todayLiters: 500,
      limitLiters: null,
      ratio: null,
      level: null,
    });
  });
});

describe('reuseKpi — estimativas das oportunidades aplicadas', () => {
  // 10 dias a 10.000 L/dia => 300.000 L/mes: purga 6% = 18.000, ciclos 8% = 24.000, chuva 5% = 15.000
  const readings = Array.from({ length: 10 }, (_, i) => ({
    t: NOW.getTime() - (10 - i) * DAY,
    v: 10000,
  }));
  const analysis = analyzeReuse([{ unitId: 'dc-sp1', readings }], NOW);

  it('nada aplicado: zero de economia e de reuso', () => {
    expect(reuseKpi(analysis, () => false)).toEqual({
      savedLitersPerMonth: 0,
      reusePercent: 0,
      appliedCount: 0,
    });
  });

  it('soma a economia de tudo que foi aplicado e calcula o reuso so das oportunidades de reuso', () => {
    const kpi = reuseKpi(analysis, (id) => id === 'purge-dc-sp1' || id === 'cycles-dc-sp1');
    expect(kpi.appliedCount).toBe(2);
    expect(kpi.savedLitersPerMonth).toBe(42000);
    // So a purga e "Reuso": 18.000 / 300.000 = 6%. Ciclos (Reducao) nao conta como reuso.
    expect(kpi.reusePercent).toBe(6);
  });

  it('sem consumo-base (sem unidades analisaveis) o percentual de reuso nao existe', () => {
    const empty = analyzeReuse([], NOW);
    expect(reuseKpi(empty, () => true).reusePercent).toBeNull();
  });
});

describe('wasteKpi — residuos destinados', () => {
  const lot = (id: string, daysAgo: number, deadlineDays: number): PendingLot => ({
    id,
    wasteTypeId: 't1',
    quantity: 1,
    generatedAt: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
    deadlineDays,
  });

  it('percentual = destinados / (destinados + em aberto), com vencidos contados a parte', () => {
    const kpi = wasteKpi(3, [lot('P-1', 40, 30), lot('P-2', 5, 30)], NOW);
    expect(kpi).toEqual({ destined: 3, open: 2, overdue: 1, percent: 60 });
  });

  it('sem pendentes: 100% dos lotes conhecidos estao destinados', () => {
    expect(wasteKpi(4, [], NOW).percent).toBe(100);
  });

  it('sem nenhum lote nao ha percentual', () => {
    expect(wasteKpi(0, [], NOW)).toEqual({ destined: 0, open: 0, overdue: 0, percent: null });
  });

  it('perfil que nao enxerga os pendentes nao recebe percentual (seria sempre 100%)', () => {
    expect(wasteKpi(4, null, NOW)).toEqual({
      destined: 4,
      open: null,
      overdue: null,
      percent: null,
    });
  });

  it('arredonda para uma casa decimal', () => {
    expect(wasteKpi(1, [lot('P-1', 1, 30), lot('P-2', 1, 30)], NOW).percent).toBe(33.3);
  });
});
