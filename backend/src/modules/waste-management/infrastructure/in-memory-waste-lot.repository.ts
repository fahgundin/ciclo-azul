import { Injectable } from '@nestjs/common';
import type { WasteLot } from '../domain/waste-lot';
import type { WasteLotRepository } from '../domain/waste-lot.repository';

/**
 * Adapter de saida (driven) em memoria do WasteLotRepository.
 * Fallback quando DATABASE_URL nao esta definido (dev rapido/testes/CI).
 */
@Injectable()
export class InMemoryWasteLotRepository implements WasteLotRepository {
  private readonly lots: WasteLot[] = [];

  async save(lot: WasteLot): Promise<void> {
    this.lots.push(lot);
  }

  async findAll(): Promise<WasteLot[]> {
    return [...this.lots].sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
