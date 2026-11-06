import type { WasteType } from './waste-type';

/**
 * Port de saida (driven): persistencia de tipos de residuo.
 * Implementado por adapters em infrastructure/ (in-memory por ora; Postgres na F2).
 */
export interface WasteTypeRepository {
  save(wasteType: WasteType): Promise<void>;
  findAll(): Promise<WasteType[]>;
  /** Tipo de residuo pelo id, ou null se nao existir. */
  findById(id: string): Promise<WasteType | null>;
}

/** Token de injecao para o port. */
export const WASTE_TYPE_REPOSITORY = Symbol('WasteTypeRepository');
