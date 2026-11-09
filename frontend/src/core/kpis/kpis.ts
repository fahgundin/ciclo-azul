import { limitLevel, type LimitLevel } from '../alerts/alerts';
import type { ReuseAnalysis } from '../reuse/opportunities';
import { isOverdue, type PendingLot } from '../waste/pending-lot';
import { dailyConsumption, type ChartPoint } from '../water/consumption';

/**
 * KPIs do painel (R10 / HU09) — core/, funcoes puras.
 *
 * ADAPTER NO CLIENTE: o backend nao tem endpoint de KPIs (R10, #14, em aberto). Os
 * indicadores sao CALCULADOS aqui sobre dados reais (leituras, lotes destinados) e
 * sobre os adapters em memoria de limites, lotes pendentes e oportunidades aplicadas
 * (que valem so neste navegador). Reuso e economia sao ESTIMATIVAS de demonstracao
 * (core/reuse/opportunities.ts). Ver docs/migracao-frontend.md.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quantos dias o grafico de consumo mostra. */
export const CHART_DAYS = 7;

export interface DayConsumption {
  /** Inicio do dia (UTC), em ms. */
  dayStart: number;
  liters: number;
  /** E o dia de hoje: o consumo ainda esta em curso. */
  partial: boolean;
}

/** Consumo diario (UTC) dos ultimos `days` dias, do mais antigo ao dia de hoje. */
export function dailySeries(
  points: readonly ChartPoint[],
  now: Date,
  days: number = CHART_DAYS,
): DayConsumption[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) => {
    const dayStart = today - (days - 1 - i) * DAY_MS;
    return {
      dayStart,
      liters: dailyConsumption(points, new Date(dayStart)),
      partial: dayStart === today,
    };
  });
}

export interface WaterKpi {
  todayLiters: number;
  /** Limite geral diario em litros; `null` = sem limite definido. */
  limitLiters: number | null;
  /** Consumo / limite; `null` sem limite. */
  ratio: number | null;
  /** Nivel frente ao limite (mesma regra dos alertas); `null` sem limite. */
  level: LimitLevel | null;
}

export function waterKpi(todayLiters: number, limitLiters: number | null): WaterKpi {
  if (limitLiters === null) {
    return { todayLiters, limitLiters, ratio: null, level: null };
  }
  return {
    todayLiters,
    limitLiters,
    ratio: todayLiters / limitLiters,
    level: limitLevel(todayLiters, limitLiters),
  };
}

export interface ReuseKpi {
  /** Economia estimada das oportunidades marcadas como aplicadas, em litros/mes. */
  savedLitersPerMonth: number;
  /** Economia das oportunidades de reuso aplicadas / consumo mensal estimado; `null` sem base. */
  reusePercent: number | null;
  appliedCount: number;
}

/** Percentual com uma casa decimal. */
const percentOf = (part: number, whole: number): number => Math.round((part / whole) * 1000) / 10;

/**
 * Reuso e economia a partir das oportunidades APLICADAS. Sao estimativas: o percentual
 * de cada oportunidade e fixo de demonstracao e "aplicada" vale so neste navegador.
 */
export function reuseKpi(analysis: ReuseAnalysis, isApplied: (id: string) => boolean): ReuseKpi {
  const applied = analysis.opportunities.filter((o) => isApplied(o.id));
  const saved = applied.reduce((sum, o) => sum + o.monthlySavingLiters, 0);
  const reused = applied
    .filter((o) => o.kind === 'Reuso')
    .reduce((sum, o) => sum + o.monthlySavingLiters, 0);
  return {
    savedLitersPerMonth: saved,
    reusePercent:
      analysis.monthlyConsumptionLiters > 0
        ? percentOf(reused, analysis.monthlyConsumptionLiters)
        : null,
    appliedCount: applied.length,
  };
}

export interface WasteKpi {
  destined: number;
  /** Lotes gerados e ainda sem destinacao; `null` = o perfil nao enxerga lotes pendentes. */
  open: number | null;
  overdue: number | null;
  /** Destinados / (destinados + em aberto); `null` sem pendentes conhecidos ou sem lotes. */
  percent: number | null;
}

/**
 * Residuos destinados. `pending` e `null` quando o perfil nao enxerga os lotes pendentes
 * (o porcentual nao e calculado: sem eles seria sempre 100%).
 */
export function wasteKpi(
  destinedCount: number,
  pending: readonly PendingLot[] | null,
  now: Date,
): WasteKpi {
  if (pending === null) {
    return { destined: destinedCount, open: null, overdue: null, percent: null };
  }
  const total = destinedCount + pending.length;
  return {
    destined: destinedCount,
    open: pending.length,
    overdue: pending.filter((lot) => isOverdue(lot, now)).length,
    percent: total > 0 ? percentOf(destinedCount, total) : null,
  };
}
