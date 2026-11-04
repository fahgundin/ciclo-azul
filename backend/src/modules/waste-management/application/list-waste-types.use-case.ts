import { Inject, Injectable } from '@nestjs/common';
import type { WasteType } from '../domain/waste-type';
import {
  WASTE_TYPE_REPOSITORY,
  type WasteTypeRepository,
} from '../domain/waste-type.repository';

/**
 * Caso de uso: listar os tipos de residuo cadastrados (R07).
 * Suporta o criterio "disponivel para registro de destinacao" (consumido por R06).
 */
@Injectable()
export class ListWasteTypes {
  constructor(
    @Inject(WASTE_TYPE_REPOSITORY)
    private readonly repository: WasteTypeRepository,
  ) {}

  execute(): Promise<WasteType[]> {
    return this.repository.findAll();
  }
}
