import { Inject, Injectable } from '@nestjs/common';
import type { WasteLot } from '../domain/waste-lot';
import { WASTE_LOT_REPOSITORY, type WasteLotRepository } from '../domain/waste-lot.repository';

/** Caso de uso: listar os lotes com destinacao registrada (R06). */
@Injectable()
export class ListWasteLots {
  constructor(
    @Inject(WASTE_LOT_REPOSITORY)
    private readonly lots: WasteLotRepository,
  ) {}

  execute(): Promise<WasteLot[]> {
    return this.lots.findAll();
  }
}
