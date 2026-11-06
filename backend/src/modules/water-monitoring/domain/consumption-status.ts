import {
  STALE_AFTER_MINUTES,
  type ConsumptionState,
  type ReadingType,
} from '@ciclo-azul/contracts';
import type { WaterReading } from './water-reading';

/** Estado de consumo de uma unidade, ja classificado (R05). */
export interface ConsumptionStatus {
  unitId: string;
  state: ConsumptionState;
  /** Valor da ultima leitura, em litros; null quando nao ha leitura. */
  currentValueInLiters: number | null;
  lastReadingAt: Date | null;
  lastReadingType: ReadingType | null;
}

const MINUTE_MS = 60 * 1000;

/**
 * Classifica o estado de uma unidade a partir da sua ultima leitura (por timestamp).
 *
 * - sem leitura                                  -> `no-data`
 * - ultima leitura ha MAIS de `staleAfterMinutes` -> `stale` ("Sem dados recentes")
 * - caso contrario (inclusive exatamente no limite) -> `live`
 *
 * Funcao PURA: `now` e injetado, entao o limite e testavel sem relogio real. Uma
 * leitura com timestamp levemente no futuro (relogio do sensor adiantado) conta
 * como recente.
 */
export function computeConsumptionStatus(
  unitId: string,
  latest: WaterReading | null,
  now: Date,
  staleAfterMinutes: number = STALE_AFTER_MINUTES,
): ConsumptionStatus {
  if (!latest) {
    return {
      unitId,
      state: 'no-data',
      currentValueInLiters: null,
      lastReadingAt: null,
      lastReadingType: null,
    };
  }

  const ageMs = now.getTime() - latest.timestamp.getTime();
  return {
    unitId,
    state: ageMs > staleAfterMinutes * MINUTE_MS ? 'stale' : 'live',
    currentValueInLiters: latest.valueInLiters,
    lastReadingAt: latest.timestamp,
    lastReadingType: latest.readingType,
  };
}
