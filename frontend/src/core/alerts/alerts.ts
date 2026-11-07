import type { UnitConsumptionStatus, WasteTypeView } from '@ciclo-azul/contracts';
import { formatDateTime, formatLiters, formatNumber } from '../format';
import type { ConsumptionLimits } from '../limits/limits';
import { isOverdue, lotDueDate, type PendingLot } from '../waste/pending-lot';

/**
 * Avaliacao dos alertas (R03 limite de consumo, R08 lote sem destinacao e unidade
 * sem dados recentes) — core/, funcoes puras.
 *
 * ADAPTER NO CLIENTE: o backend nao gera nem persiste alertas (R03/R08 em aberto).
 * Os alertas sao CALCULADOS aqui, a cada avaliacao, sobre dados reais (estado e
 * leituras) e sobre os adapters em memoria de limites e lotes pendentes. Nao ha
 * notificacao push nem e-mail. Ver docs/migracao-frontend.md.
 */

export type AlertKind = 'limit' | 'waste' | 'sensor';
export type AlertLevel = 'crit' | 'warn';

export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  limit: 'Consumo',
  waste: 'Resíduos',
  sensor: 'Sensores',
};

export interface Alert {
  id: string;
  kind: AlertKind;
  level: AlertLevel;
  title: string;
  body: string;
}

/** A partir de quanto do limite o aviso "Perto do limite" aparece. */
export const NEAR_LIMIT_RATIO = 0.8;

export interface AlertInput {
  now: Date;
  statuses: readonly UnitConsumptionStatus[];
  /** Consumo do dia atual (UTC), em litros, por unidade. */
  consumptionToday: Readonly<Record<string, number>>;
  limits: ConsumptionLimits;
  pendingLots: readonly PendingLot[];
  wasteTypes: readonly WasteTypeView[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function limitAlert(id: string, name: string, used: number, limit: number): Alert | null {
  if (used > limit) {
    return {
      id: `limit-${id}-exceeded`,
      kind: 'limit',
      level: 'crit',
      title: `Limite excedido: ${name}`,
      body: `Consumo de hoje em ${formatLiters(used)}, acima do limite de ${formatLiters(limit)}.`,
    };
  }
  if (used >= limit * NEAR_LIMIT_RATIO) {
    return {
      id: `limit-${id}-near`,
      kind: 'limit',
      level: 'warn',
      title: `Perto do limite: ${name}`,
      body: `${formatNumber(Math.round((used / limit) * 100))}% do limite diário (${formatLiters(used)} de ${formatLiters(limit)}).`,
    };
  }
  return null;
}

/** Calcula os alertas em aberto, os criticos primeiro. */
export function evaluateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];

  // R03: limite por unidade e limite geral.
  for (const [unitId, limit] of Object.entries(input.limits.units)) {
    const alert = limitAlert(unitId, unitId, input.consumptionToday[unitId] ?? 0, limit);
    if (alert) {
      alerts.push(alert);
    }
  }
  if (input.limits.general !== null) {
    const total = Object.values(input.consumptionToday).reduce((sum, value) => sum + value, 0);
    const alert = limitAlert('general', 'consumo geral', total, input.limits.general);
    if (alert) {
      alerts.push(alert);
    }
  }

  // R08: lote gerado e sem destinacao cujo prazo ja expirou. Dentro do prazo: sem alerta.
  const typeName = new Map(input.wasteTypes.map((t) => [t.id, t.name]));
  for (const lot of input.pendingLots) {
    if (!isOverdue(lot, input.now)) {
      continue;
    }
    const daysLate = Math.floor((input.now.getTime() - lotDueDate(lot).getTime()) / DAY_MS);
    alerts.push({
      id: `waste-${lot.id}`,
      kind: 'waste',
      level: 'crit',
      title: `Lote ${lot.id} sem destinação`,
      body: `${typeName.get(lot.wasteTypeId) ?? 'Tipo de resíduo removido'} (${formatNumber(lot.quantity)}): prazo ${
        daysLate < 1 ? 'venceu hoje' : `venceu há ${daysLate} dia(s)`
      }.`,
    });
  }

  // Unidade que tinha leitura e parou ha mais do limite de "sem dados recentes".
  for (const status of input.statuses) {
    if (status.state === 'stale' && status.lastReadingAt) {
      alerts.push({
        id: `sensor-${status.unitId}`,
        kind: 'sensor',
        level: 'warn',
        title: `Sem dados recentes: ${status.unitId}`,
        body: `Última leitura em ${formatDateTime(status.lastReadingAt)}. O consumo desta unidade não está sendo medido.`,
      });
    }
  }

  const rank = (alert: Alert): number => (alert.level === 'crit' ? 0 : 1);
  return alerts.sort((a, b) => rank(a) - rank(b));
}
