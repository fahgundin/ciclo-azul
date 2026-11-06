import { Injectable } from '@nestjs/common';
import type { WasteTypeRepository } from '../domain/waste-type.repository';
import type { WasteType } from '../domain/waste-type';

/**
 * Adapter de saida (driven) em memoria.
 * PLACEHOLDER: sera substituido por um adapter Postgres (TypeORM) quando a
 * persistencia da F2 for aplicada aos modulos, sem alterar dominio/aplicacao.
 */
@Injectable()
export class InMemoryWasteTypeRepository implements WasteTypeRepository {
  private readonly items: WasteType[] = [];

  async save(wasteType: WasteType): Promise<void> {
    this.items.push(wasteType);
  }

  async findAll(): Promise<WasteType[]> {
    return [...this.items];
  }

  async findById(id: string): Promise<WasteType | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
}
