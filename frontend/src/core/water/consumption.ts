import {
  STALE_AFTER_MINUTES,
  type ConsumptionState,
  type ReadingEvent,
  type UnitConsumptionStatus,
  type WaterReadingView,
} from '@ciclo-azul/contracts';

/**
 * Regras do painel de consumo em tempo real (R05) — core/, funcoes puras.
 *
 * O backend entrega o estado ATUAL (`GET /water-status`) e cada leitura nova pelo
 * WebSocket. A passagem para "Sem dados recentes" NAO e emitida pelo servidor: o
 * cliente recalcula com `lastReadingAt` e `staleAfterMinutes` (contrato-iot.md, secao 5).
 */

const MINUTE_MS = 60 * 1000;

/**
 * Estado a partir da ultima leitura: sem leitura = `no-data`; ha MAIS de
 * `staleAfterMinutes` = `stale`; caso contrario (inclusive exatamente no limite, ou
 * leitura levemente no futuro) = `live`. Mesma regra do backend.
 */
export function deriveState(
  lastReadingAt: string | null,
  staleAfterMinutes: number,
  now: Date,
): ConsumptionState {
  if (!lastReadingAt) {
    return 'no-data';
  }
  const ageMs = now.getTime() - Date.parse(lastReadingAt);
  return ageMs > staleAfterMinutes * MINUTE_MS ? 'stale' : 'live';
}

/** Recalcula o estado de cada unidade para o instante `now` (o tempo passa sem leitura nova). */
export function refreshStates(
  statuses: readonly UnitConsumptionStatus[],
  now: Date,
): UnitConsumptionStatus[] {
  return statuses.map((status) => ({
    ...status,
    state: deriveState(status.lastReadingAt, status.staleAfterMinutes, now),
  }));
}

const byUnit = (a: UnitConsumptionStatus, b: UnitConsumptionStatus): number =>
  a.unitId.localeCompare(b.unitId, 'pt-BR');

/**
 * Aplica uma leitura recebida em tempo real. A "ultima leitura" e a de maior
 * `timestamp` (como no backend): leitura mais antiga que a atual nao a substitui.
 * Unidade ainda desconhecida passa a constar na lista.
 */
export function applyReadingEvent(
  statuses: readonly UnitConsumptionStatus[],
  event: ReadingEvent,
  now: Date,
): UnitConsumptionStatus[] {
  const current = statuses.find((status) => status.unitId === event.unitId);
  const staleAfterMinutes = current?.staleAfterMinutes ?? STALE_AFTER_MINUTES;

  if (current?.lastReadingAt && Date.parse(event.timestamp) < Date.parse(current.lastReadingAt)) {
    return [...statuses];
  }

  const updated: UnitConsumptionStatus = {
    unitId: event.unitId,
    state: deriveState(event.timestamp, staleAfterMinutes, now),
    currentValueInLiters: event.valueInLiters,
    lastReadingAt: event.timestamp,
    lastReadingType: event.readingType,
    staleAfterMinutes,
  };
  return [...statuses.filter((status) => status.unitId !== event.unitId), updated].sort(byUnit);
}

/**
 * Junta o estado atual da tela com um snapshot do REST (`GET /water-status`). O snapshot
 * pode ser mais ANTIGO que uma leitura recebida pelo WebSocket enquanto a requisicao
 * estava em voo: por unidade, vence quem tem o `lastReadingAt` mais recente (empate: o
 * snapshot). Unidade que so a tela conhece (veio ao vivo) e mantida.
 */
export function mergeStatuses(
  current: readonly UnitConsumptionStatus[],
  snapshot: readonly UnitConsumptionStatus[],
): UnitConsumptionStatus[] {
  const live = new Map(current.map((status) => [status.unitId, status]));
  const merged = new Map<string, UnitConsumptionStatus>();
  for (const fresh of snapshot) {
    const known = live.get(fresh.unitId);
    const knownIsNewer =
      known?.lastReadingAt != null &&
      (fresh.lastReadingAt === null ||
        Date.parse(known.lastReadingAt) > Date.parse(fresh.lastReadingAt));
    merged.set(fresh.unitId, knownIsNewer && known ? known : fresh);
  }
  for (const [unitId, status] of live) {
    if (!merged.has(unitId)) {
      merged.set(unitId, status);
    }
  }
  return [...merged.values()].sort(byUnit);
}

/** Ponto de um grafico de linha: instante (ms) e valor em litros. */
export interface ChartPoint {
  t: number;
  v: number;
}

/** Maximo de pontos mantidos no grafico. */
export const MAX_CHART_POINTS = 60;

/** Leituras (em qualquer ordem) viram pontos cronologicos, mantendo so os `limit` mais recentes. */
export function toChartPoints(
  readings: readonly Pick<WaterReadingView, 'timestamp' | 'valueInLiters'>[],
  limit: number = MAX_CHART_POINTS,
): ChartPoint[] {
  return readings
    .map((r) => ({ t: Date.parse(r.timestamp), v: r.valueInLiters }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)
    .slice(-limit);
}

/** Junta historico e leituras ao vivo, sem repetir a mesma leitura (instante + valor). */
export function mergeChartPoints(
  history: readonly ChartPoint[],
  live: readonly ChartPoint[],
  limit: number = MAX_CHART_POINTS,
): ChartPoint[] {
  const seen = new Set<string>();
  const merged: ChartPoint[] = [];
  for (const point of [...history, ...live]) {
    const key = `${point.t}:${point.v}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(point);
    }
  }
  return merged.sort((a, b) => a.t - b.t).slice(-limit);
}

/**
 * Consumo de um dia: soma dos valores das leituras daquele dia (UTC), em litros.
 * PRESSUPOSTO a confirmar: leituras incrementais (volume por intervalo). Ver
 * contrato-iot.md, secao 8. O dia e UTC, como as datas de leitura manual.
 */
export function dailyConsumption(points: readonly ChartPoint[], day: Date): number {
  const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const end = start + 24 * 60 * 60 * 1000;
  const total = points.filter((p) => p.t >= start && p.t < end).reduce((sum, p) => sum + p.v, 0);
  return Math.round(total * 100) / 100;
}
