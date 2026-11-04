import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WasteType } from '../domain/waste-type';
import {
  WASTE_TYPE_REPOSITORY,
  type WasteTypeRepository,
} from '../domain/waste-type.repository';

/**
 * Caso de uso: cadastrar um tipo de residuo (R07).
 * A invariante de classificacao obrigatoria e aplicada pela entidade de dominio.
 */
@Injectable()
export class RegisterWasteType {
  constructor(
    @Inject(WASTE_TYPE_REPOSITORY)
    private readonly repository: WasteTypeRepository,
  ) {}

  async execute(input: { name: string; classification: string }): Promise<WasteType> {
    const wasteType = WasteType.create({
      id: randomUUID(),
      name: input.name,
      classification: input.classification,
    });
    await this.repository.save(wasteType);
    return wasteType;
  }
}
