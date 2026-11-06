import type { WasteLot } from './waste-lot';

/**
 * Port de saida (driven): persistencia de lotes com destinacao registrada.
 * Implementado por adapters em infrastructure/ (in-memory e Postgres).
 */
export interface WasteLotRepository {
  save(lot: WasteLot): Promise<void>;
  /** Todos os lotes, do mais recente para o mais antigo (por data de destinacao). */
  findAll(): Promise<WasteLot[]>;
}

/** Token de injecao para o port. */
export const WASTE_LOT_REPOSITORY = Symbol('WasteLotRepository');
