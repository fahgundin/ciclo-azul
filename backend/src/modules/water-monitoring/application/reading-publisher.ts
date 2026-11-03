import type { ReadingEvent } from '@ciclo-azul/contracts';

/**
 * Port de SAIDA (driven): publica uma leitura registrada para consumidores de
 * tempo real (ex.: painel via WebSocket).
 *
 * A aplicacao depende desta interface; o adapter concreto (gateway WebSocket na
 * infraestrutura) a implementa. Mantem a direcao da dependencia hexagonal.
 */
export interface ReadingPublisher {
  publish(event: ReadingEvent): void;
}

/** Token de injecao para o port (resolvido via DI do NestJS). */
export const READING_PUBLISHER = Symbol('ReadingPublisher');
