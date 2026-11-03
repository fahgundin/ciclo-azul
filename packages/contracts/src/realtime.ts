/**
 * Contrato do canal de tempo real (WebSocket) backend -> frontend.
 * Compartilhado para back e front concordarem no formato do evento (R05).
 */

/** Nome do evento emitido quando uma nova leitura e registrada. */
export const READING_EVENT = 'reading';

/** Nome do evento que o cliente envia para assinar uma unidade. */
export const SUBSCRIBE_UNIT_EVENT = 'subscribe-unit';

/**
 * Payload do evento de leitura em tempo real.
 * Derivado da leitura registrada; o front usa para atualizar o painel da unidade.
 */
export interface ReadingEvent {
  unitId: string;
  sensorId: string;
  /** ISO 8601 UTC. */
  timestamp: string;
  valueInLiters: number;
  readingType: 'sensor' | 'manual';
}

/** Monta o nome da room (socket.io) de uma unidade. */
export function unitRoom(unitId: string): string {
  return `unit:${unitId}`;
}
