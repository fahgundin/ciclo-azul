import type { ReadingType } from './water-consumption.js';

/**
 * Contrato do estado de consumo por unidade (R05). Compartilhado entre backend e
 * frontend. A regra dos 15 minutos esta oficializada em docs/contrato-iot.md (secao 5).
 */

/**
 * Estado de uma unidade no painel de tempo real:
 * - `live`: a ultima leitura e recente (ate STALE_AFTER_MINUTES);
 * - `stale`: ha leituras, mas a ultima tem mais de STALE_AFTER_MINUTES ("Sem dados recentes");
 * - `no-data`: a unidade nunca teve leitura.
 */
export type ConsumptionState = 'live' | 'stale' | 'no-data';

/** Minutos sem leitura a partir dos quais a unidade passa a "Sem dados recentes". */
export const STALE_AFTER_MINUTES = 15;

/** Rotulo exibido para a unidade sem leitura recente. */
export const NO_RECENT_DATA_LABEL = 'Sem dados recentes';

/** Estado de consumo de uma unidade (resposta de GET /water-status). */
export interface UnitConsumptionStatus {
  unitId: string;
  state: ConsumptionState;
  /** Valor da ultima leitura, em litros; null quando nao ha leitura. */
  currentValueInLiters: number | null;
  /** Momento (ISO 8601 UTC) da ultima leitura; null quando nao ha leitura. */
  lastReadingAt: string | null;
  /** Origem da ultima leitura; null quando nao ha leitura. */
  lastReadingType: ReadingType | null;
  /** Limite usado para classificar como `stale` (permite ao cliente recalcular). */
  staleAfterMinutes: number;
}
