import { formatLiters } from '../format';
import type { ChartPoint } from '../water/consumption';

/**
 * Oportunidades de reuso e reducao de desperdicio (R02) — core/, funcoes puras.
 *
 * ADAPTER EM MEMORIA / ESTIMATIVAS DE DEMONSTRACAO: o backend do R02 (#13) nao
 * existe e nao ha analise de historico. O CATALOGO de oportunidades e FIXO e os
 * percentuais de economia sao valores de referencia de demonstracao (vieram do
 * prototipo), NAO o resultado de uma analise. O que vem de dados REAIS: o consumo-base
 * de cada unidade (leituras) e a decisao de quais unidades tem historico suficiente.
 * Ver docs/migracao-frontend.md, "Oportunidades de reuso (R02)".
 */

/** Historico minimo (horas) para recomendar. Valor de demonstracao: criterio oficial a definir. */
export const MIN_HISTORY_HOURS = 24;

/**
 * Idade maxima (horas) da ULTIMA leitura para recomendar. Unidade parada ha mais que
 * isso nao recebe recomendacao: o historico estaria desatualizado e o consumo mensal
 * ficaria diluido pelo periodo sem leituras. Valor de demonstracao.
 */
export const MAX_LAST_READING_AGE_HOURS = 24;

/** Abaixo disso (dias de leituras) a estimativa mensal e uma extrapolacao fragil: leva aviso. */
export const LOW_CONFIDENCE_DAYS = 7;

/** Janela de historico usada para estimar o consumo mensal. */
export const HISTORY_WINDOW_DAYS = 30;

export type OpportunityKind = 'Reuso' | 'Redução';
export type Effort = 'Baixo' | 'Médio' | 'Alto';

export interface Opportunity {
  /** Estavel: `<chave>-<unidade>`. */
  id: string;
  unitId: string;
  kind: OpportunityKind;
  effort: Effort;
  title: string;
  description: string;
  evidence: string;
  /** Economia estimada, em litros por mes. */
  monthlySavingLiters: number;
}

export interface UnitHistory {
  unitId: string;
  /** Leituras (instante em ms e litros) da unidade. */
  readings: readonly ChartPoint[];
}

export interface ReuseAnalysis {
  opportunities: Opportunity[];
  /** Unidades sem historico suficiente para gerar recomendacoes. */
  insufficient: string[];
  /** Unidades com historico, mas sem leitura recente (a ultima e antiga demais). */
  stale: string[];
}

interface CatalogEntry {
  key: string;
  kind: OpportunityKind;
  effort: Effort;
  /** Fracao do consumo mensal estimada como economia (REFERENCIA DE DEMONSTRACAO). */
  ratio: number;
  /** `all` = toda unidade com historico; `top` = so a de maior consumo. */
  scope: 'all' | 'top';
  title: string;
  description: (unitId: string) => string;
}

const CATALOG: readonly CatalogEntry[] = [
  {
    key: 'purge',
    kind: 'Reuso',
    effort: 'Médio',
    ratio: 0.06,
    scope: 'all',
    title: 'Reaproveitar a água de purga das torres',
    description: (unitId) =>
      `Tratar e direcionar a purga de ${unitId} para irrigação e descarga sanitária, em vez de descartá-la.`,
  },
  {
    key: 'cycles',
    kind: 'Redução',
    effort: 'Baixo',
    ratio: 0.08,
    scope: 'top',
    title: 'Aumentar os ciclos de concentração das torres',
    description: (unitId) =>
      `Ajustar o controle de condutividade nas torres de ${unitId} reduz a reposição de água.`,
  },
  {
    key: 'rain',
    kind: 'Reuso',
    effort: 'Alto',
    ratio: 0.05,
    scope: 'all',
    title: 'Captar água de chuva para reposição',
    description: (unitId) =>
      `Avaliar a captação de água pluvial para abastecer parte da reposição das torres de ${unitId}.`,
  },
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface UnitBase {
  unitId: string;
  /** Dias de historico cobertos (ate a janela). */
  days: number;
  total: number;
  count: number;
  monthly: number;
}

type BaseResult =
  | { status: 'ok'; base: UnitBase }
  | { status: 'insufficient' }
  | { status: 'stale' };

/** Consumo-base da unidade, ou o motivo de nao haver (historico curto ou sem leitura recente). */
function baseOf(history: UnitHistory, now: Date): BaseResult {
  const end = now.getTime();
  const inWindow = history.readings.filter(
    (p) => p.t <= end && p.t >= end - HISTORY_WINDOW_DAYS * DAY_MS,
  );
  if (inWindow.length < 2) {
    return { status: 'insufficient' };
  }
  const first = Math.min(...inWindow.map((p) => p.t));
  const last = Math.max(...inWindow.map((p) => p.t));
  if (last - first < MIN_HISTORY_HOURS * HOUR_MS) {
    return { status: 'insufficient' };
  }
  // Sensor parado: a ultima leitura e antiga demais para recomendar com base no que ele mediu.
  if (end - last > MAX_LAST_READING_AGE_HOURS * HOUR_MS) {
    return { status: 'stale' };
  }
  const days = Math.min(HISTORY_WINDOW_DAYS, (end - first) / DAY_MS);
  const total = inWindow.reduce((sum, p) => sum + p.v, 0);
  return {
    status: 'ok',
    base: {
      unitId: history.unitId,
      days,
      total,
      count: inWindow.length,
      monthly: (total / days) * HISTORY_WINDOW_DAYS,
    },
  };
}

/** Analisa o historico de cada unidade e lista as oportunidades, da maior economia para a menor. */
export function analyzeReuse(units: readonly UnitHistory[], now: Date): ReuseAnalysis {
  const bases: UnitBase[] = [];
  const insufficient: string[] = [];
  const stale: string[] = [];
  for (const unit of units) {
    const result = baseOf(unit, now);
    if (result.status === 'ok') {
      bases.push(result.base);
    } else if (result.status === 'stale') {
      stale.push(unit.unitId);
    } else {
      insufficient.push(unit.unitId);
    }
  }

  const top = [...bases].sort(
    (a, b) => b.monthly - a.monthly || a.unitId.localeCompare(b.unitId, 'pt-BR'),
  )[0];

  const opportunities: Opportunity[] = [];
  for (const base of bases) {
    for (const entry of CATALOG) {
      if (entry.scope === 'top' && base !== top) {
        continue;
      }
      const days = Math.max(1, Math.round(base.days));
      opportunities.push({
        id: `${entry.key}-${base.unitId}`,
        unitId: base.unitId,
        kind: entry.kind,
        effort: entry.effort,
        title: entry.title,
        description: entry.description(base.unitId),
        evidence:
          `Consumo medido em ${days} dia(s): ${formatLiters(Math.round(base.total))} em ${base.count} leituras` +
          (entry.scope === 'top' ? '; unidade de maior consumo' : '') +
          `. Economia = ${Math.round(entry.ratio * 100)}% do consumo mensal (referência de demonstração).` +
          (base.days < LOW_CONFIDENCE_DAYS
            ? ` Baixa confiança: o consumo mensal foi extrapolado de apenas ${days} dia(s) de leituras.`
            : ''),
        monthlySavingLiters: Math.round(base.monthly * entry.ratio),
      });
    }
  }

  opportunities.sort(
    (a, b) => b.monthlySavingLiters - a.monthlySavingLiters || a.id.localeCompare(b.id),
  );
  return {
    opportunities,
    insufficient: insufficient.sort((a, b) => a.localeCompare(b, 'pt-BR')),
    stale: stale.sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

/** Marcacao de oportunidades aplicadas (hoje em memoria; amanha, a API). */
export interface AppliedStore {
  has(id: string): boolean;
  apply(id: string): void;
}

/** ADAPTER EM MEMORIA das oportunidades aplicadas (perde tudo ao recarregar). */
export class InMemoryAppliedStore implements AppliedStore {
  private readonly ids = new Set<string>();

  has(id: string): boolean {
    return this.ids.has(id);
  }

  apply(id: string): void {
    this.ids.add(id);
  }
}

export const sumSavings = (opportunities: readonly Opportunity[]): number =>
  opportunities.reduce((sum, o) => sum + o.monthlySavingLiters, 0);
